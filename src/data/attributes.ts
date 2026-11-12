import {
  siCss, siDocker, siFirebase, siFlask, siGit, siGithubactions, siHtml5, siJavascript, siKeycloak, siMysql,
  siOpenjdk, siPostgresql, siPython, siSpringboot, siTemporal, siVuedotjs,
} from 'simple-icons';

export interface Ref { label: string; href: string }

export interface Skill {
  id: string;
  name: string;
  /** SVG path data on a 24x24 grid, when a free single-colour logo exists. */
  icon?: string;
  /** Letters shown in the slot when there is no logo. */
  mark?: string;
  usedIn: Ref[];
}

export interface SkillGroup { title: string; skills: Skill[] }

const jms = { label: 'JMS', href: '#relics/jms' };
const lms = { label: 'Brainrot LMS', href: '#relics/brainrot-lms' };
const tutor = { label: 'TutorGuru', href: '#relics/tutorguru' };
const cs102 = { label: 'CS102 Attendance', href: '#relics/cs102-attendance' };
const oracle = { label: 'Oracle internship', href: '#journey/oracle' };

/**
 * Technologies shown as equipment slots. `usedIn` holds only what the résumé supports;
 * skills without a named project carry no link.
 */
export const equipment: SkillGroup[] = [
  {
    title: 'Languages',
    skills: [
      { id: 'java', name: 'Java', icon: siOpenjdk.path, usedIn: [] },
      { id: 'python', name: 'Python', icon: siPython.path, usedIn: [] },
      { id: 'javascript', name: 'JavaScript', icon: siJavascript.path, usedIn: [] },
      { id: 'html', name: 'HTML', icon: siHtml5.path, usedIn: [] },
      { id: 'css', name: 'CSS', icon: siCss.path, usedIn: [] },
      { id: 'sql', name: 'SQL', mark: 'SQL', usedIn: [oracle] },
      { id: 'plsql', name: 'PL/SQL', mark: 'PL', usedIn: [oracle] },
    ],
  },
  {
    title: 'Frameworks and Tools',
    skills: [
      { id: 'spring-boot', name: 'Spring Boot', icon: siSpringboot.path, usedIn: [cs102] },
      { id: 'flask', name: 'Flask', icon: siFlask.path, usedIn: [] },
      { id: 'vue', name: 'Vue.js', icon: siVuedotjs.path, usedIn: [tutor] },
      { id: 'keycloak', name: 'Keycloak', icon: siKeycloak.path, usedIn: [jms, lms] },
      { id: 'temporal', name: 'Temporal', icon: siTemporal.path, usedIn: [jms] },
      { id: 'rest', name: 'REST APIs', mark: 'REST', usedIn: [cs102, oracle] },
      { id: 'apex', name: 'Oracle APEX', mark: 'APEX', usedIn: [oracle] },
      { id: 'git', name: 'Git', icon: siGit.path, usedIn: [] },
    ],
  },
  {
    title: 'Cloud and DevOps',
    skills: [
      { id: 'aws', name: 'AWS', mark: 'AWS', usedIn: [] },
      { id: 'azure', name: 'Microsoft Azure', mark: 'AZ', usedIn: [] },
      { id: 'firebase', name: 'Firebase', icon: siFirebase.path, usedIn: [tutor] },
      { id: 'docker', name: 'Docker', icon: siDocker.path, usedIn: [] },
      { id: 'github-actions', name: 'GitHub Actions', icon: siGithubactions.path, usedIn: [] },
    ],
  },
  {
    title: 'Databases',
    skills: [
      { id: 'postgresql', name: 'PostgreSQL', icon: siPostgresql.path, usedIn: [] },
      { id: 'mysql', name: 'MySQL', icon: siMysql.path, usedIn: [] },
    ],
  },
];

/** Things with no logo, shown as plain lists under the grid. */
export const lists: { title: string; entries: string[] }[] = [
  {
    title: 'Concepts',
    entries: ['Object-Oriented Programming', 'Microservices', 'Database Design', 'CI/CD', 'Agile Development'],
  },
  {
    title: 'Certifications',
    entries: ['Google UX Design (Jul 2025)', 'SCS-AWS GenAI, Foundational (Dec 2024)', 'Google AI Essentials (Aug 2024)'],
  },
];
