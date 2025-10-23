export interface LearningArticle {
  id: string;
  learningModuleId: string;
  title: string;
  description: string;
  number: number;
  contentSections: LearningArticleContentSection[];
}

export interface LearningArticleContentSection {
  title: string;
  order: number;
  contentItems: LearningArticleContentItem[];
}

export interface LearningArticleContentItem {
  content: string;
  order: number;
  type: number; // 0: Text, 1: Image, 2: Video, etc.
}

export interface LearningArticleWithModule {
  article: LearningArticle;
  moduleTitle: string;
  moduleDescription: string;
}
