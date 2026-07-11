const TRAIN_FILTERS = ["class", "score", "similarity"] as const;
export type TrainFilters = (typeof TRAIN_FILTERS)[number];

export type SimilarityPreset =
  | "duplicate_recent"
  | "duplicate_library"
  | "training_pick"
  | "candidate"
  | "mislabel"
  | "new_scenario";

export type TrainFilter = {
  classes?: string[];
  min_score?: number;
  max_score?: number;
  similarity_preset?: SimilarityPreset;
  min_similarity?: number;
  max_similarity?: number;
  similar_to_class?: string;
};

export type ClassificationItemMetadata = {
  confidenceAtAdd?: number;
  predictedLabelAtAdd?: string;
  assignedLabel?: string;
  addedAt?: string;
  relabeled?: boolean;
};

export type ClassificationSimilarityInfo = {
  maxSimilarity?: number;
  maxSameClassSimilarity?: number;
  maxSameClassRecentSimilarity?: number;
  maxSameClassDatasetSimilarity?: number;
  maxOtherClassSimilarity?: number;
  bestMatchClass?: string;
  bestMatchFilename?: string;
  suggestedAction?: string;
  duplicateGroup?: string;
  duplicateGroupSize?: number;
  trainingPick?: boolean;
  trainingPickReason?: string;
  trainingPickReasons?: string[];
  burstConfidenceMin?: number;
  burstConfidenceMax?: number;
  burstConfidenceSpread?: number;
  burstConfidenceRank?: number;
  burstDiversityRank?: number;
  burstAvgIntraSimilarity?: number;
  burstHardPositivePoolSize?: number;
  burstDiversityPoolSize?: number;
};

export type ClassificationItemData = {
  filepath: string;
  filename: string;
  name: string;
  timestamp?: number;
  eventId?: string;
  score?: number;
  metadata?: ClassificationItemMetadata;
  similarity?: ClassificationSimilarityInfo;
};

export type ClassificationThreshold = {
  recognition: number;
  unknown: number;
};

export type ClassifiedEvent = {
  id: string;
  label?: string;
  score?: number;
};

export type ClassificationImageMetadata = {
  confidence_at_add?: number;
  predicted_label_at_add?: string;
  assigned_label?: string;
  added_at?: string;
  relabeled?: boolean;
  phash?: string;
  source?: string;
  source_train_filename?: string;
};

export type TrainSuggestion = {
  filename: string;
  predicted_label: string;
  confidence: number;
  max_similarity: number;
  max_same_class_similarity: number;
  max_same_class_dataset_similarity?: number;
  max_same_class_recent_similarity?: number;
  max_other_class_similarity: number;
  best_match_class?: string;
  best_match_filename?: string;
  suggested_action: string;
  duplicate_group?: string;
  duplicate_group_size?: number;
  training_pick?: boolean;
  training_pick_reason?: string;
  training_pick_reasons?: string[];
  burst_confidence_min?: number;
  burst_confidence_max?: number;
  burst_confidence_spread?: number;
  burst_confidence_rank?: number;
  burst_diversity_rank?: number;
  burst_avg_intra_similarity?: number;
  burst_hard_positive_pool_size?: number;
  burst_diversity_pool_size?: number;
};

export type ClassificationDatasetResponse = {
  categories: {
    [id: string]: string[];
  };
  training_metadata: {
    has_trained: boolean;
    last_training_date: string | null;
    last_training_image_count: number;
    current_image_count: number;
    new_images_count: number;
    dataset_changed: boolean;
  } | null;
  image_metadata?: {
    [category: string]: {
      [filename: string]: ClassificationImageMetadata;
    };
  };
};

export type TrainSuggestionsResponse = {
  suggestions: TrainSuggestion[];
};
