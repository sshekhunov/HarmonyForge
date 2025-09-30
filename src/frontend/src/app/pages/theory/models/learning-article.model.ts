export interface LearningArticle {
  id: string;
  learningModuleId: string;
  contentItems: LearningArticleContentItem[];
}

export interface LearningArticleContentItem {
  content: string;
  sectionBlockNumber: number;
}

export interface LearningArticleWithModule {
  article: LearningArticle;
  moduleTitle: string;
  moduleDescription: string;
}
