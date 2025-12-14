export interface LearningItem {
  id: string;
  learningModuleId: string;
  title: string;
  description: string;
  number: number;
  itemType: LearningItemType;
}

export interface LearningItemWithModule {
  item: LearningItem;
  moduleTitle: string;
  moduleDescription: string;
}

export enum LearningItemType {
  Article = 0,
  Exercise = 1
}

