import React, { useState } from 'react';
import { Company, Employee, SkillName, Trait } from '../game/types';

interface PersonnelViewProps {
  company: Company;
  onOpenModal: (type: 'hireEmployee', context: { itemToHire: Employee }) => void;
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


const EmployeeCard = ({ employee, onHire }: { employee: Employee, onHire?: (employee: Employee) => void }) => {
    return (
        <div className="card employee-card">
            <div className="employee-card__header">
                <div>
                    <h4 className="employee-card__name">{employee.firstName} {employee.lastName}</h4>
                </div>
                <div className="employee-card__actions">
                    <div className="employee-card__salary">${employee.salaryPerDay.toFixed(2)} / day</div>
                </div>
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
                <div className="modal-actions" style={{justifyContent: 'center', marginTop: '1rem'}}>
                    <button className="btn" onClick={() => onHire(employee)}>Hire</button>
                </div>
            )}

        </div>
    );
}

const PersonnelView: React.FC<PersonnelViewProps> = ({ company, onOpenModal }) => {
  const [activeTab, setActiveTab] = useState<'staff' | 'market'>('staff');

  const hiredEmployees = Object.values(company.employees);
  const candidates = company.jobMarketCandidates || [];

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
          {Object.keys(company.structures).length > 0 ? Object.entries(employeesByStructure).map(([structureId, employees]) => {
              const structure = company.structures[structureId];
              return (
                  <div key={structureId}>
                      <h3>{structure ? structure.name : 'Unassigned'}</h3>
                      <div className="card-container">
                          {employees.map(emp => <EmployeeCard key={emp.id} employee={emp} />)}
                      </div>
                  </div>
              )
          }) : <p className="placeholder-text">You have no hired staff.</p>}
        </div>
      )}

      {activeTab === 'market' && (
        <div>
           {candidates.length > 0 ? (
                <div className="card-container">
                    {candidates.map(candidate => (
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