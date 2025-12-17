export interface LearningCourse {
  id: string;
  code: string;
  title: string;
  description: string;
  categoryId?: string;
  modules: LearningModule[];
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  number: number;
}
