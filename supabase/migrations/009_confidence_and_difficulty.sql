ALTER TABLE user_question_progress
ADD COLUMN confidence_rating smallint CHECK (confidence_rating >= 0 AND confidence_rating <= 10),
ADD COLUMN perceived_difficulty text CHECK (perceived_difficulty IN ('too-easy', 'easy', 'moderate', 'hard', 'very-hard'));
