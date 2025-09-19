import type { Employee, JobRole, SkillName } from '../../types';
import { FinanceService } from './FinanceService';
import { XP_PER_LEVEL } from './constants';
import type { Company } from '../Company';

export class HRService {
  constructor(private readonly company: Company, private readonly finance: FinanceService) {}

  hireEmployee(employee: Employee, structureId: string, ticks: number): boolean {
    if (this.company.employees[employee.id]) {
      alert('This employee is already hired.');
      return false;
    }
    const salaryCost = employee.salaryPerDay;
    if (this.company.capital < salaryCost * 7) {
      alert('Not enough capital to securely hire this employee.');
      return false;
    }

    employee.structureId = structureId;
    employee.status = 'Idle';
    employee.lastRaiseTick = ticks;
    this.company.employees[employee.id] = employee;
    this.company.structures[structureId].employeeIds.push(employee.id);

    this.company.jobMarketCandidates = this.company.jobMarketCandidates.filter(c => c.id !== employee.id);
    return true;
  }

  fireEmployee(employeeId: string): Employee | null {
    const employee = this.company.employees[employeeId];
    if (!employee) return null;

    const severance = employee.salaryPerDay * 7;
    if (this.company.capital < severance) {
      alert('Not enough capital to pay severance.');
      return null;
    }

    this.company.capital -= severance;
    this.finance.logExpense('salaries', severance);

    if (employee.structureId) {
      const structure = this.company.structures[employee.structureId];
      if (structure) {
        structure.employeeIds
          .filter(id => id !== employeeId)
          .forEach(id => {
            const otherEmployee = this.company.employees[id];
            if (otherEmployee) {
              otherEmployee.morale = Math.max(0, otherEmployee.morale - 10);
            }
          });
        structure.employeeIds = structure.employeeIds.filter(id => id !== employeeId);
      }
    }

    delete this.company.employees[employeeId];

    employee.structureId = null;
    employee.status = 'Idle';
    this.company.jobMarketCandidates.unshift(employee);

    return employee;
  }

  acceptRaise(employeeId: string, newSalary: number, ticks: number) {
    const employee = this.company.employees[employeeId];
    if (employee) {
      employee.salaryPerDay = newSalary;
      employee.morale = Math.min(100, employee.morale + 25);
      employee.lastRaiseTick = ticks;
      this.company.alerts = this.company.alerts.filter(
        a => !(a.type === 'raise_request' && a.context?.employeeId === employeeId),
      );
    }
  }

  offerBonus(employeeId: string, bonus: number, ticks: number) {
    const employee = this.company.employees[employeeId];
    if (employee && this.company.capital >= bonus) {
      this.company.capital -= bonus;
      this.finance.logExpense('salaries', bonus);
      employee.morale = Math.min(100, employee.morale + 15);
      employee.lastRaiseTick = ticks;
      this.company.alerts = this.company.alerts.filter(
        a => !(a.type === 'raise_request' && a.context?.employeeId === employeeId),
      );
    }
  }

  declineRaise(employeeId: string) {
    const employee = this.company.employees[employeeId];
    if (employee) {
      employee.morale = Math.max(0, employee.morale - 20);
      this.company.alerts = this.company.alerts.filter(
        a => !(a.type === 'raise_request' && a.context?.employeeId === employeeId),
      );
    }
  }

  processDailyCycle(ticks: number, rng: () => number): number {
    let totalSalaries = 0;
    const employeesToQuit: string[] = [];

    Object.values(this.company.employees).forEach(emp => {
      totalSalaries += emp.salaryPerDay;

      if (emp.morale < 20 && rng() < 0.05) {
        employeesToQuit.push(emp.id);
      }

      const ticksSinceRaise = ticks - (emp.lastRaiseTick || emp.timeOnMarket || 0);
      const hasExistingRequest = this.company.alerts.some(
        a => a.type === 'raise_request' && a.context?.employeeId === emp.id,
      );

      if (!hasExistingRequest && ticksSinceRaise > 365 * 24) {
        const totalSkillPoints = Object.values(emp.skills).reduce((sum, s) => sum + s.level, 0);
        const baseSalary = 50 + totalSkillPoints * 8;

        if (baseSalary > emp.salaryPerDay * 1.05) {
          const newSalary = baseSalary * (1 + (rng() - 0.5) * 0.1);
          const alertKey = `${emp.id}-raise_request`;
          const existingAlert = this.company.alerts.find(a => a.id.startsWith(`alert-${alertKey}`));
          if (!existingAlert) {
            this.company.alerts.push({
              id: `alert-${alertKey}-${ticks}`,
              type: 'raise_request',
              message: `${emp.firstName} ${emp.lastName} is requesting a salary review.`,
              location: { structureId: emp.structureId || '', roomId: '', zoneId: '' },
              tickGenerated: ticks,
              context: { employeeId: emp.id, newSalary },
            });
          }
        }
      }

      const roleToSkillMap: Record<JobRole, SkillName> = {
        Gardener: 'Gardening',
        Technician: 'Maintenance',
        Janitor: 'Cleanliness',
        Botanist: 'Botanical',
        Salesperson: 'Negotiation',
        Generalist: 'Gardening',
      };
      const skillToLevel = roleToSkillMap[emp.role];
      if (skillToLevel) {
        const skill = emp.skills[skillToLevel];
        if (skill.level < 10) {
          skill.xp += 2;
          if (skill.xp >= XP_PER_LEVEL) {
            skill.level = Math.min(10, skill.level + 1);
            skill.xp = 0;
          }
        }
      }
    });

    employeesToQuit.forEach(empId => {
      const emp = this.company.employees[empId];
      if (emp) {
        delete this.company.employees[empId];
        if (emp.structureId) {
          this.company.structures[emp.structureId].employeeIds = this.company.structures[
            emp.structureId
          ].employeeIds.filter(id => id !== empId);
        }
        emp.structureId = null;
        this.company.jobMarketCandidates.unshift(emp);
        this.company.alerts.push({
          id: `alert-${emp.id}-employee_quit-${ticks}`,
          type: 'employee_quit',
          message: `${emp.firstName} ${emp.lastName} has quit due to low morale.`,
          location: { structureId: '', roomId: '', zoneId: '' },
          tickGenerated: ticks,
          context: { employeeId: emp.id },
        });
      }
    });

    return totalSalaries;
  }
}
