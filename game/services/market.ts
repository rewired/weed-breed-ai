import { Company, Employee, JobRole, Skill, SkillName, Trait } from '../types';
import { getBlueprints } from '../blueprints';
import type { RandomAdapter } from '../utils';

const ALL_SKILLS: SkillName[] = ['Gardening', 'Maintenance', 'Technical', 'Botanical', 'Cleanliness', 'Negotiation'];
const SKILL_TO_ROLE_MAP: Record<SkillName, JobRole> = {
    Gardening: 'Gardener',
    Maintenance: 'Technician',
    Technical: 'Technician',
    Cleanliness: 'Janitor',
    Botanical: 'Botanist',
    Negotiation: 'Salesperson',
};

export async function updateJobMarket(company: Company, rng: RandomAdapter, ticks: number, seed: number) {
      const { personnelData } = getBlueprints();
      const { traits } = personnelData;
      let names: { firstName: string, lastName: string }[] = [];

      try {
          const week = Math.floor(ticks / (24 * 7));
          const apiSeed = `weedbreed-${seed}-${week}`;
          const response = await fetch(`https://randomuser.me/api/?results=12&inc=name&seed=${apiSeed}`);
          if (!response.ok) throw new Error('API response not ok');
          const data = await response.json();
          names = data.results.map((r: any) => ({
              firstName: r.name.first,
              lastName: r.name.last
          }));
      } catch (error) {
          console.warn("Could not fetch names from randomuser.me API, using local fallback.", error);
          const { firstNames, lastNames } = personnelData;
          for (let i = 0; i < 12; i++) {
              const firstName = firstNames.length > 0 ? firstNames[rng.int(0, firstNames.length - 1)] : `Candidate${i + 1}`;
              const lastName = lastNames.length > 0 ? lastNames[rng.int(0, lastNames.length - 1)] : 'Fallback';
              names.push({ firstName, lastName });
          }
      }

      const newCandidates: Employee[] = names.map(name => {
          const skills: Record<SkillName, Skill> = {} as any;
          let totalSkillPoints = 0;
          let highestSkill: SkillName = 'Gardening';
          let highestLevel = -1;

          ALL_SKILLS.forEach(skillName => {
              const level = rng.float() * 5;
              skills[skillName] = { name: skillName, level, xp: 0 };
              totalSkillPoints += level;
              if (level > highestLevel) {
                  highestLevel = level;
                  highestSkill = skillName;
              }
          });

          const role = SKILL_TO_ROLE_MAP[highestSkill] || 'Generalist';

          const assignedTraits: Trait[] = [];
          const traitRoll = rng.float();
          if (traitRoll < 0.7 && traits.length > 0) {
              assignedTraits.push(traits[rng.int(0, traits.length - 1)]);
              if (rng.chance(0.2)) {
                  assignedTraits.push(traits[rng.int(0, traits.length - 1)]);
              }
          }
          
          const baseSalary = 50;
          const salaryPerSkillPoint = 8;
          let salary = baseSalary + (totalSkillPoints * salaryPerSkillPoint);

          let salaryModifier = 1.0;
          if (assignedTraits.some(t => t.id === 'trait_frugal')) {
              salaryModifier -= 0.15;
          }
          if (assignedTraits.some(t => t.id === 'trait_demanding')) {
              salaryModifier += 0.20;
          }

          salary *= salaryModifier;

          return {
              id: `emp-${Date.now()}-${rng.float()}`,
              firstName: name.firstName,
              lastName: name.lastName,
              role,
              skills,
              traits: assignedTraits,
              salaryPerDay: salary,
              energy: 100,
              morale: 75,
              structureId: null,
              status: 'Idle',
              currentTask: null,
              leaveHours: 0,
          };
      });

      company.jobMarketCandidates = newCandidates;
  }
