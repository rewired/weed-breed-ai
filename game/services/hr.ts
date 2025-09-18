import { Company, Employee, JobRole, Skill, SkillName, Task, Trait, OvertimePolicy } from '../types';
import { resolveTask } from './taskEngine';
import * as BALANCE from '../constants/balance';

export function hireEmployee(company: Company, employee: Employee, structureId: string, ticks: number): boolean {
    if (company.employees[employee.id]) {
        alert("This employee is already hired.");
        return false;
    }
    const salaryCost = employee.salaryPerDay;
    if (company.capital < salaryCost * 7) {
        alert("Not enough capital to securely hire this employee.");
        return false;
    }
    
    employee.structureId = structureId;
    employee.status = 'Idle';
    employee.lastRaiseTick = ticks;
    company.employees[employee.id] = employee;
    company.structures[structureId].employeeIds.push(employee.id);

    company.jobMarketCandidates = company.jobMarketCandidates.filter(c => c.id !== employee.id);
    return true;
}

export function fireEmployee(company: Company, employeeId: string): Employee | null {
    const employee = company.employees[employeeId];
    if (!employee) return null;

    const severance = employee.salaryPerDay * BALANCE.SEVERANCE_PAY_DAYS;
    if (company.capital < severance) {
        alert("Not enough capital to pay severance.");
        return null;
    }

    company.capital -= severance;
    company.logExpense('salaries', severance);

    if (employee.structureId) {
        const structure = company.structures[employee.structureId];
        if (structure) {
            structure.employeeIds
                .filter(id => id !== employeeId)
                .forEach(id => {
                    const otherEmployee = company.employees[id];
                    if (otherEmployee) {
                        otherEmployee.morale = Math.max(0, otherEmployee.morale - BALANCE.FIRE_MORALE_DROP);
                    }
                });
            structure.employeeIds = structure.employeeIds.filter(id => id !== employeeId);
        }
    }

    delete company.employees[employeeId];
    
    employee.structureId = null;
    employee.status = 'Idle';
    company.jobMarketCandidates.unshift(employee);

    return employee;
}

export function acceptRaise(company: Company, employeeId: string, newSalary: number, ticks: number) {
    const employee = company.employees[employeeId];
    if (employee) {
        employee.salaryPerDay = newSalary;
        employee.morale = Math.min(100, employee.morale + BALANCE.RAISE_ACCEPT_MORALE_GAIN);
        employee.lastRaiseTick = ticks;
        company.alerts = company.alerts.filter(a => !(a.type === 'raise_request' && a.context?.employeeId === employeeId));
    }
}

export function offerBonus(company: Company, employeeId: string, bonus: number, ticks: number) {
    const employee = company.employees[employeeId];
    if (employee && company.capital >= bonus) {
        company.capital -= bonus;
        company.logExpense('salaries', bonus);
        employee.morale = Math.min(100, employee.morale + BALANCE.BONUS_OFFER_MORALE_GAIN);
        employee.lastRaiseTick = ticks;
        company.alerts = company.alerts.filter(a => !(a.type === 'raise_request' && a.context?.employeeId === employeeId));
    }
}

export function declineRaise(company: Company, employeeId: string) {
    const employee = company.employees[employeeId];
    if (employee) {
        employee.morale = Math.max(0, employee.morale - BALANCE.RAISE_DECLINE_MORALE_DROP);
        company.alerts = company.alerts.filter(a => !(a.type === 'raise_request' && a.context?.employeeId === employeeId));
    }
}

export function assignEmployeeRole(company: Company, employeeId: string, role: JobRole) {
    const employee = company.employees[employeeId];
    if (employee) {
        employee.role = role;
    }
}

export function updateEmployeesAI(company: Company, ticks: number, rng: () => number) {
      const tasksInProgress = new Set<string>();
      Object.values(company.employees).forEach(emp => {
          if (emp.status === 'Working' && emp.currentTask) {
              tasksInProgress.add(emp.currentTask.id);
          }
      });

      for(const employee of Object.values(company.employees)) {
          if (!employee.structureId) continue;
          const structure = company.structures[employee.structureId];
          if (!structure) continue;

          switch(employee.status) {
              case 'OffDuty':
                  if (ticks >= (employee.offDutyUntilTick || 0)) {
                      employee.status = 'Idle';
                      employee.energy = 100;
                      employee.offDutyUntilTick = undefined;
                      employee.morale = Math.min(100, employee.morale + BALANCE.CYCLE_COMPLETION_MORALE_GAIN);
                  }
                  break;

              case 'Working':
                  const task = employee.currentTask;
                  if (!task) {
                      employee.status = 'Idle';
                      break;
                  }
                  
                  employee.energy -= BALANCE.ENERGY_COST_PER_TICK_WORKING;
                  task.progressTicks = (task.progressTicks || 0) + 1;

                  if (task.progressTicks >= task.durationTicks) {
                      resolveTask(company, employee, task, ticks, rng);
                      employee.currentTask = null;
                      
                      if (employee.energy < 0) {
                          const overtimeHours = -employee.energy / BALANCE.ENERGY_COST_PER_TICK_WORKING;
                          if (company.overtimePolicy === 'timeOff') {
                              employee.leaveHours = (employee.leaveHours || 0) + overtimeHours;
                          } else {
                              const hourlyRate = employee.salaryPerDay / 8;
                              const overtimePay = overtimeHours * hourlyRate * 1.5;
                              if (company.capital >= overtimePay) {
                                  company.capital -= overtimePay;
                                  company.logExpense('salaries', overtimePay);
                              }
                          }
                      }
                      
                      if (employee.energy < BALANCE.ENERGY_REST_THRESHOLD) {
                        employee.energy = 0;
                        employee.status = 'OffDuty';
                        employee.offDutyUntilTick = ticks + BALANCE.OFF_DUTY_DURATION_TICKS;
                      } else {
                        employee.status = 'Idle';
                      }
                  }
                  break;

              case 'Resting':
                  employee.energy += BALANCE.ENERGY_REGEN_PER_TICK_RESTING;
                  if (employee.energy >= 100) {
                      employee.energy = 100;
                      employee.status = 'Idle';
                  }
                  break;

              case 'Idle':
                  if (employee.offDutyUntilTick && ticks < employee.offDutyUntilTick) {
                    employee.status = 'OffDuty';
                    break;
                  }

                  if (employee.energy < BALANCE.ENERGY_REST_THRESHOLD) {
                      if (structure.getRestingEmployeeCount(company) < structure.getBreakroomCapacity()) {
                          employee.status = 'Resting';
                          break;
                      }
                  }
                  
                  const tasks = [...structure.tasks].sort((a, b) => b.priority - a.priority);
                  const suitableTask = tasks.find(task => 
                      !tasksInProgress.has(task.id) &&
                      task.requiredRole === employee.role &&
                      employee.skills[task.requiredSkill].level >= task.minSkillLevel
                  );

                  if (suitableTask) {
                      employee.status = 'Working';
                      employee.currentTask = suitableTask;
                      tasksInProgress.add(suitableTask.id);
                  } else {
                      employee.energy = Math.min(100, employee.energy + BALANCE.IDLE_ENERGY_REGEN_PER_TICK);
                  }
                  break;
          }
      }
}

export function processDailyUpdates(company: Company, ticks: number, rng: () => number) {
    let totalSalaries = 0;
    const employeesToQuit: string[] = [];

    Object.values(company.employees).forEach(emp => {
        totalSalaries += emp.salaryPerDay;
        
        if (emp.morale < 20 && rng() < BALANCE.LOW_MORALE_QUIT_CHANCE_PER_DAY) {
            employeesToQuit.push(emp.id);
        }

        const ticksSinceRaise = ticks - (emp.lastRaiseTick || emp.timeOnMarket || 0);
        const hasExistingRequest = company.alerts.some(a => a.type === 'raise_request' && a.context?.employeeId === emp.id);

        if (!hasExistingRequest && ticksSinceRaise > BALANCE.TICKS_BETWEEN_RAISE_REQUESTS) {
            const totalSkillPoints = Object.values(emp.skills).reduce((sum, s) => sum + s.level, 0);
            const baseSalary = 50 + (totalSkillPoints * 8);
            
            if (baseSalary > emp.salaryPerDay * 1.05) {
                const newSalary = baseSalary * (1 + (rng() - 0.5) * 0.1);
                const alertKey = `${emp.id}-raise_request`;
                const existingAlert = company.alerts.find(a => a.id.startsWith(`alert-${alertKey}`));
                if (!existingAlert) {
                    company.alerts.push({
                        id: `alert-${alertKey}-${ticks}`,
                        type: 'raise_request',
                        message: `${emp.firstName} ${emp.lastName} is requesting a salary review.`,
                        location: { structureId: emp.structureId || '', roomId: '', zoneId: '' },
                        tickGenerated: ticks,
                        context: { employeeId: emp.id, newSalary: newSalary }
                    });
                }
            }
        }

        const roleToSkillMap: Record<JobRole, SkillName> = {
            'Gardener': 'Gardening',
            'Technician': 'Maintenance',
            'Janitor': 'Cleanliness',
            'Botanist': 'Botanical',
            'Salesperson': 'Negotiation',
            'Generalist': 'Gardening',
        };
        const skillToLevel = roleToSkillMap[emp.role];
        if (skillToLevel) {
            const skill = emp.skills[skillToLevel];
            if (skill.level < 10) {
                skill.xp += BALANCE.DAILY_ROLE_XP_GAIN;
                if (skill.xp >= BALANCE.XP_PER_LEVEL) {
                    skill.level = Math.min(10, skill.level + 1);
                    skill.xp = 0;
                }
            }
        }
    });
    
    employeesToQuit.forEach(empId => {
        const emp = company.employees[empId];
        if (emp) {
            delete company.employees[empId];
            if (emp.structureId) {
                company.structures[emp.structureId].employeeIds = company.structures[emp.structureId].employeeIds.filter(id => id !== empId);
            }
            emp.structureId = null;
            company.jobMarketCandidates.unshift(emp);
            company.alerts.push({
                id: `alert-${emp.id}-employee_quit-${ticks}`,
                type: 'employee_quit',
                message: `${emp.firstName} ${emp.lastName} has quit due to low morale.`,
                location: { structureId: '', roomId: '', zoneId: ''},
                tickGenerated: ticks,
                context: { employeeId: emp.id }
            });
        }
    });

    company.logExpense('salaries', totalSalaries);
    company.capital -= totalSalaries;
}