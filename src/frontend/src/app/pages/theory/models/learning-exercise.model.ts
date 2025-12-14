export interface LearningExercise {
  id: string;
  learningModuleId: string;
  title: string;
  description: string;
  number: number;
  appType: ExerciseAppType;
  appVersion: string;
  taskContentItems: LearningContentItem[];
  taskAppSettings: string;
}

export interface LearningExerciseWithModule {
  exercise: LearningExercise;
  moduleTitle: string;
  moduleDescription: string;
}

export interface LearningContentItem {
  content: string;
  order: number;
  type: LearningContentItemType;
}

export enum ExerciseAppType {
  ScoreAnalysis = 0,
  MidiPerformance = 1,
  AudioIdentification = 2
}

export enum LearningContentItemType {
  Text = 0,
  Image = 1,
  YouTubeVideo = 2,
  MusicXml = 3
}

