import React, { useState } from 'react';
import { Company, Employee, SkillName, Trait, JobRole } from '../game/types';

const ALL_ROLES: JobRole[] = ['Gardener', 'Technician', 'Janitor', 'Botanist', 'Salesperson', 'Generalist'];

interface PersonnelViewProps {
  company: Company;
  onOpenModal: (type: 'hireEmployee', context: { itemToHire: Employee }) => void;
  onAssignEmployeeRole: (employeeId: string, role: JobRole) => void;
}

const SkillBar = ({ name, level }: { name: string, level: number }) => (
  <div className="skill">
    <span className="skill__name">{name}</span>
    <div className="skill__bar-container">
      <div className="skill__bar" style={{ width: `${level * 10}%` }}></div>
    </div>
    <span className="skill__level">{level.toFixed(1)}</span>
  </div>
);

const TraitTag = ({ trait }: { trait: Trait }) => (
    <span className={`trait-tag ${trait.type}`} title={trait.description}>
        {trait.name}
    </span>
);


const EmployeeCard = ({ employee, onHire, onAssignRole }: { employee: Employee, onHire?: (employee: Employee) => void, onAssignRole?: (employeeId: string, role: JobRole) => void }) => {
    
    let statusText;
    switch(employee.status) {
        case 'Working':
            statusText = <strong>Working</strong>;
            break;
        case 'Resting':
            statusText = <span style={{color: 'var(--warning-color)'}}>Resting</span>;
            break;
        default: // Idle
            if (employee.energy < 20) {
                statusText = <span style={{color: 'var(--danger-color)'}}>Idle (Low Energy)</span>;
            } else {
                statusText = <span style={{color: 'var(--text-secondary-color)'}}>Idle</span>;
            }
            break;
    }

    return (
        <div className="card employee-card">
            <div className="employee-card__header">
                <div className="employee-card__name-wrapper">
                    <h4 className="employee-card__name" title={`${employee.firstName} ${employee.lastName}`}>{employee.firstName} {employee.lastName}</h4>
                    <div className="employee-card__salary">${employee.salaryPerDay.toFixed(2)} / day</div>
                </div>
            </div>
            
            {onAssignRole ? (
                <div className="employee-card__role">
                    <label htmlFor={`role-${employee.id}`} style={{ marginRight: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary-color)'}}>Role:</label>
                    <select
                      id={`role-${employee.id}`}
                      value={employee.role}
                      onChange={(e) => onAssignRole(employee.id, e.target.value as JobRole)}
                    >
                      {ALL_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                </div>
            ) : (
                 <p className="employee-card__role" style={{fontSize: '0.9rem', color: 'var(--text-secondary-color)'}}>
                    Role: <strong>{employee.role}</strong>
                </p>
            )}

            <div className="employee-card__status-grid">
                <span>Energy</span>
                <div className="employee-card__status-bar">
                    <div className="energy" style={{ width: `${employee.energy}%` }}></div>
                </div>
                 <span>Morale</span>
                <div className="employee-card__status-bar">
                    <div className="morale" style={{ width: `${employee.morale}%` }}></div>
                </div>
            </div>

            <div className="employee-card__current-task">
                Status: {statusText} <br />
                {employee.status === 'Working' && employee.currentTask?.description}
                {employee.status === 'Idle' && employee.energy < 20 && 'Needs rest, no breakroom available.'}
            </div>
            
            <div className="employee-card__skills">
                {Object.values(employee.skills).map(skill => (
                    <SkillBar key={skill.name} name={skill.name} level={skill.level} />
                ))}
            </div>

            {employee.traits.length > 0 && (
                <div className="employee-card__traits">
                    {employee.traits.map(trait => <TraitTag key={trait.id} trait={trait} />)}
                </div>
            )}
            
            {onHire && (
                <div className="employee-card__hire-action">
                    <button className="btn" onClick={() => onHire(employee)}>Hire</button>
                </div>
            )}

        </div>
    );
}

const PersonnelView: React.FC<PersonnelViewProps> = ({ company, onOpenModal, onAssignEmployeeRole }) => {
  const [activeTab, setActiveTab] = useState<'staff' | 'market'>('staff');
  const [roleFilter, setRoleFilter] = useState<JobRole | 'All'>('All');

  const hiredEmployees = Object.values(company.employees);
  const candidates = company.jobMarketCandidates || [];
  
  const filteredCandidates = roleFilter === 'All'
    ? candidates
    : candidates.filter(c => c.role === roleFilter);

  const employeesByStructure: Record<string, Employee[]> = {};
  hiredEmployees.forEach(emp => {
      const structId = emp.structureId || 'unassigned';
      if (!employeesByStructure[structId]) {
          employeesByStructure[structId] = [];
      }
      employeesByStructure[structId].push(emp);
  });
  
  const handleHire = (employee: Employee) => {
    onOpenModal('hireEmployee', { itemToHire: employee });
  };

  return (
    <div className="content-panel personnel-view">
      <div className="tabs">
        <button className={`tab ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>
          Your Staff ({hiredEmployees.length})
        </button>
        <button className={`tab ${activeTab === 'market' ? 'active' : ''}`} onClick={() => setActiveTab('market')}>
          Job Market ({candidates.length})
        </button>
      </div>

      {activeTab === 'staff' && (
        <div>
          {Object.keys(company.structures).length > 0 && hiredEmployees.length > 0 ? Object.entries(employeesByStructure).map(([structureId, employees]) => {
              const structure = company.structures[structureId];
              return (
                  <div key={structureId}>
                      <h3>{structure ? structure.name : 'Unassigned'}</h3>
                      <div className="card-container">
                          {employees.map(emp => <EmployeeCard key={emp.id} employee={emp} onAssignRole={onAssignEmployeeRole} />)}
                      </div>
                  </div>
              )
          }) : <p className="placeholder-text">You have no hired staff.</p>}
        </div>
      )}

      {activeTab === 'market' && (
        <div>
           <div className="personnel-view-header">
                <h3>Available Candidates</h3>
                <div className="form-group">
                    <label htmlFor="roleFilter">Filter by Role</label>
                    <select id="roleFilter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as JobRole | 'All')}>
                        <option value="All">All Roles</option>
                        {ALL_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                </div>
           </div>
           {candidates.length > 0 ? (
                <div className="card-container">
                    {filteredCandidates.map(candidate => (
                        <EmployeeCard key={candidate.id} employee={candidate} onHire={handleHire} />
                    ))}
                </div>
            ) : (
                <p className="placeholder-text">Searching for new candidates... Check back soon.</p>
            )}
        </div>
      )}
    </div>
  );
};

export default PersonnelView;