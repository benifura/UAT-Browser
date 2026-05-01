export type ScenarioResultStatus = 'Pass' | 'Fail' | 'Partially Passed';

export type NavigationStatus = 'Not started' | 'In progress' | 'Completed';

export interface Scenario {
  id: string;
  title: string;
  summary: string;
  businessGoal: string;
  preCondition: string;
  scenario: {
    given: string;
    when: string;
    and?: string[];
    then: string[];
  };
}

export interface ScenarioPack {
  projectName: string;
  scenarios: Scenario[];
}

export interface ScenarioProgress {
  status: ScenarioResultStatus | '';
  comments: string;
}

export interface SavedProgress {
  currentScenarioIndex: number | null;
  generalComments: string;
  results: Record<string, ScenarioProgress>;
  lastSaved: string | null;
}
