export interface LearningCourse {
  id: string;
  code: string;
  title: string;
  description: string;
  modules: LearningModule[];
}

export interface LearningModule {
  title: string;
  description: string;
  items: LearningModuleItem[];
}

export interface LearningModuleItem {
  id: string;
  title: string;
  description: string;
  type: number; // 0: Article, 1: Exercise, 2: Test
}
