-- OIR Results Table
CREATE TABLE oir_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  score INT,
  total_questions INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PPDT Results Table
CREATE TABLE ppdt_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  user_story TEXT,
  image_description TEXT,
  ai_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WAT Results Table
CREATE TABLE wat_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  responses JSONB,
  ai_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SRT Results Table
CREATE TABLE srt_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  responses JSONB,
  ai_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TAT Results Table
CREATE TABLE tat_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  user_story TEXT,
  image_description TEXT,
  ai_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PIQs Table
CREATE TABLE piqs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  place_of_residence TEXT,
  state TEXT,
  district TEXT,
  religion TEXT,
  sc_st_obc TEXT,
  mother_tongue TEXT,
  date_of_birth DATE,
  marital_status TEXT,
  tenth_percentage TEXT,
  twelfth_percentage TEXT,
  graduation_percentage TEXT,
  achievements TEXT,
  father_occupation TEXT,
  father_income TEXT,
  mother_occupation TEXT,
  games_sports TEXT,
  hobbies TEXT,
  ncc_training TEXT,
  responsibilities_held TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
