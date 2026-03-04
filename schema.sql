--
-- PostgreSQL database dump
--

\restrict QYezHEtSlar4VVDQT97sWnpiGn1m6HvgA0f5OUhVXe24roz5LO4SxTLFmQUE4YU

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: book_chapters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.book_chapters (
    id integer NOT NULL,
    book_id integer NOT NULL,
    chapter_number integer NOT NULL,
    chapter_name character varying(255) NOT NULL,
    description text,
    question_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: book_chapters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.book_chapters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: book_chapters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.book_chapters_id_seq OWNED BY public.book_chapters.id;


--
-- Name: book_grades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.book_grades (
    book_id bigint NOT NULL,
    grade_id bigint NOT NULL
);


--
-- Name: books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.books (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    subject_id integer NOT NULL,
    grade character varying(50) NOT NULL,
    description text,
    chapters integer DEFAULT 0,
    total_questions integer DEFAULT 0,
    icon character varying(50),
    color character varying(20),
    is_active boolean DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: books_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.books_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: books_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.books_id_seq OWNED BY public.books.id;


--
-- Name: campuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campuses (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    school_id integer,
    address text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    firebase_school_id text
);


--
-- Name: campuses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campuses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campuses_id_seq OWNED BY public.campuses.id;


--
-- Name: content_creator_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_creator_stats (
    creator_id text NOT NULL,
    questions_created integer DEFAULT 0 NOT NULL,
    questions_approved integer DEFAULT 0 NOT NULL,
    pending_review integer DEFAULT 0 NOT NULL,
    rejected_questions integer DEFAULT 0 NOT NULL,
    this_week integer DEFAULT 0 NOT NULL,
    approval_rate integer DEFAULT 100 NOT NULL,
    creation_trend jsonb DEFAULT '[]'::jsonb NOT NULL,
    difficulty_distribution jsonb DEFAULT '[]'::jsonb NOT NULL,
    question_type_distribution jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: grades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grades (
    id bigint NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: grades_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grades_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grades_id_seq OWNED BY public.grades.id;


--
-- Name: oup_question_banks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oup_question_banks (
    id text NOT NULL,
    grade text,
    class text,
    subject text,
    book text,
    chapter text,
    slo text,
    difficulty text,
    type text,
    question_type text,
    question text,
    interactive_data jsonb,
    is_interactive boolean,
    created_by text,
    bank_type text,
    created_at timestamp with time zone
);


--
-- Name: question_bank_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_bank_stats (
    id text NOT NULL,
    scope text,
    school_id text,
    last_updated timestamp with time zone,
    total_questions integer,
    questions_by_subject jsonb,
    questions_by_grade jsonb,
    questions_by_difficulty jsonb,
    questions_by_type jsonb
);


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id integer NOT NULL,
    question_text text NOT NULL,
    type character varying(50),
    grade character varying(50),
    subject text,
    book text,
    chapter text,
    slo text,
    difficulty character varying(50),
    answer text,
    explanation text,
    marks integer,
    qb_source character varying(50),
    source_school_pk integer,
    is_interactive boolean DEFAULT false,
    interactive_data jsonb,
    image_url character varying(500),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cognitive_level jsonb,
    source_school_id text,
    book_id bigint,
    CONSTRAINT questions_school_source_check CHECK (((((qb_source)::text = 'school'::text) AND (source_school_pk IS NOT NULL)) OR ((qb_source)::text <> 'school'::text)))
);


--
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- Name: quiz_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_assignments (
    id bigint NOT NULL,
    quiz_id text NOT NULL,
    student_id text NOT NULL,
    quiz_title text,
    is_marked boolean DEFAULT false NOT NULL,
    time_limit_minutes integer DEFAULT 30 NOT NULL,
    schedule jsonb,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'assigned'::text NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    score numeric,
    total_marks numeric,
    percentage numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quiz_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quiz_assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quiz_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quiz_assignments_id_seq OWNED BY public.quiz_assignments.id;


--
-- Name: quiz_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_attempts (
    id integer NOT NULL,
    quiz_id integer NOT NULL,
    student_id integer NOT NULL,
    score numeric(10,2),
    total_marks integer,
    started_at timestamp without time zone,
    submitted_at timestamp without time zone,
    status character varying(50),
    answers jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: quiz_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quiz_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quiz_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quiz_attempts_id_seq OWNED BY public.quiz_attempts.id;


--
-- Name: quiz_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_items (
    id integer NOT NULL,
    quiz_id integer NOT NULL,
    question_id integer NOT NULL,
    "position" integer NOT NULL,
    marks integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cognitive_level jsonb
);


--
-- Name: quiz_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quiz_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quiz_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quiz_items_id_seq OWNED BY public.quiz_items.id;


--
-- Name: quizzes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quizzes (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    teacher_id integer,
    school_id integer,
    grade character varying(50),
    subject character varying(100),
    book character varying(100),
    quiz_type character varying(50),
    quiz_format character varying(50),
    total_marks integer,
    time_limit_minutes integer,
    is_published boolean DEFAULT false,
    show_answers boolean DEFAULT false,
    shuffle_questions boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: quizzes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quizzes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quizzes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quizzes_id_seq OWNED BY public.quizzes.id;


--
-- Name: school_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_stats (
    id text NOT NULL,
    school_id text,
    school_name text,
    total_questions integer,
    last_updated timestamp with time zone,
    questions_by_subject jsonb,
    questions_by_grade jsonb,
    questions_by_difficulty jsonb,
    questions_by_type jsonb
);


--
-- Name: schools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schools (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    address text,
    city character varying(100),
    country character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    firebase_id text,
    status text DEFAULT 'Active'::text
);


--
-- Name: schools_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schools_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schools_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schools_id_seq OWNED BY public.schools.id;


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    icon character varying(50),
    color character varying(20),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- Name: teacher_books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_books (
    id integer NOT NULL,
    teacher_id integer NOT NULL,
    book_id integer NOT NULL,
    subject_id integer NOT NULL,
    grade integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: teacher_books_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teacher_books_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teacher_books_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teacher_books_id_seq OWNED BY public.teacher_books.id;


--
-- Name: user_book_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_book_assignments (
    user_id bigint NOT NULL,
    book_id bigint NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_by bigint
);


--
-- Name: user_subject_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_subject_assignments (
    user_id bigint NOT NULL,
    subject_id bigint NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_by bigint
);


--
-- Name: user_subject_grade_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_subject_grade_assignments (
    user_id bigint NOT NULL,
    subject_id bigint NOT NULL,
    grade_id bigint NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_by bigint
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(255),
    last_name character varying(255),
    role character varying(50) DEFAULT 'student'::character varying NOT NULL,
    school_id integer,
    campus_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_grade character varying(50),
    assigned_subjects text,
    firebase_uid text
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: book_chapters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_chapters ALTER COLUMN id SET DEFAULT nextval('public.book_chapters_id_seq'::regclass);


--
-- Name: books id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books ALTER COLUMN id SET DEFAULT nextval('public.books_id_seq'::regclass);


--
-- Name: campuses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campuses ALTER COLUMN id SET DEFAULT nextval('public.campuses_id_seq'::regclass);


--
-- Name: grades id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades ALTER COLUMN id SET DEFAULT nextval('public.grades_id_seq'::regclass);


--
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- Name: quiz_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_assignments ALTER COLUMN id SET DEFAULT nextval('public.quiz_assignments_id_seq'::regclass);


--
-- Name: quiz_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts ALTER COLUMN id SET DEFAULT nextval('public.quiz_attempts_id_seq'::regclass);


--
-- Name: quiz_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_items ALTER COLUMN id SET DEFAULT nextval('public.quiz_items_id_seq'::regclass);


--
-- Name: quizzes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes ALTER COLUMN id SET DEFAULT nextval('public.quizzes_id_seq'::regclass);


--
-- Name: schools id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools ALTER COLUMN id SET DEFAULT nextval('public.schools_id_seq'::regclass);


--
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);


--
-- Name: teacher_books id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_books ALTER COLUMN id SET DEFAULT nextval('public.teacher_books_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: book_chapters book_chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_chapters
    ADD CONSTRAINT book_chapters_pkey PRIMARY KEY (id);


--
-- Name: book_grades book_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_grades
    ADD CONSTRAINT book_grades_pkey PRIMARY KEY (book_id, grade_id);


--
-- Name: books books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_pkey PRIMARY KEY (id);


--
-- Name: campuses campuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campuses
    ADD CONSTRAINT campuses_pkey PRIMARY KEY (id);


--
-- Name: content_creator_stats content_creator_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_creator_stats
    ADD CONSTRAINT content_creator_stats_pkey PRIMARY KEY (creator_id);


--
-- Name: grades grades_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_code_key UNIQUE (code);


--
-- Name: grades grades_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_label_key UNIQUE (label);


--
-- Name: grades grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_pkey PRIMARY KEY (id);


--
-- Name: oup_question_banks oup_question_banks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oup_question_banks
    ADD CONSTRAINT oup_question_banks_pkey PRIMARY KEY (id);


--
-- Name: question_bank_stats question_bank_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank_stats
    ADD CONSTRAINT question_bank_stats_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: quiz_assignments quiz_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_assignments
    ADD CONSTRAINT quiz_assignments_pkey PRIMARY KEY (id);


--
-- Name: quiz_attempts quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id);


--
-- Name: quiz_items quiz_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_items
    ADD CONSTRAINT quiz_items_pkey PRIMARY KEY (id);


--
-- Name: quizzes quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);


--
-- Name: school_stats school_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_stats
    ADD CONSTRAINT school_stats_pkey PRIMARY KEY (id);


--
-- Name: schools schools_firebase_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_firebase_id_key UNIQUE (firebase_id);


--
-- Name: schools schools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_name_key UNIQUE (name);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: teacher_books teacher_books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_books
    ADD CONSTRAINT teacher_books_pkey PRIMARY KEY (id);


--
-- Name: teacher_books teacher_books_teacher_id_book_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_books
    ADD CONSTRAINT teacher_books_teacher_id_book_id_key UNIQUE (teacher_id, book_id);


--
-- Name: user_book_assignments user_book_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_book_assignments
    ADD CONSTRAINT user_book_assignments_pkey PRIMARY KEY (user_id, book_id);


--
-- Name: user_subject_assignments user_subject_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subject_assignments
    ADD CONSTRAINT user_subject_assignments_pkey PRIMARY KEY (user_id, subject_id);


--
-- Name: user_subject_grade_assignments user_subject_grade_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subject_grade_assignments
    ADD CONSTRAINT user_subject_grade_assignments_pkey PRIMARY KEY (user_id, subject_id, grade_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_book_chapters_book_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_book_chapters_book_id ON public.book_chapters USING btree (book_id);


--
-- Name: idx_book_grades_grade_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_book_grades_grade_id ON public.book_grades USING btree (grade_id);


--
-- Name: idx_books_grade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_books_grade ON public.books USING btree (grade);


--
-- Name: idx_books_subject_grade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_books_subject_grade ON public.books USING btree (subject_id, grade);


--
-- Name: idx_books_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_books_subject_id ON public.books USING btree (subject_id);


--
-- Name: idx_questions_book_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_book_id ON public.questions USING btree (book_id);


--
-- Name: idx_questions_grade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_grade ON public.questions USING btree (grade);


--
-- Name: idx_questions_oup_creator_createdat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_oup_creator_createdat ON public.questions USING btree (qb_source, created_by, created_at DESC);


--
-- Name: idx_questions_source_school_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_source_school_pk ON public.questions USING btree (source_school_pk);


--
-- Name: idx_questions_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_subject ON public.questions USING btree (subject);


--
-- Name: idx_questions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_type ON public.questions USING btree (type);


--
-- Name: idx_quiz_assignments_assigned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_assignments_assigned_at ON public.quiz_assignments USING btree (assigned_at DESC);


--
-- Name: idx_quiz_assignments_quiz_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_assignments_quiz_id ON public.quiz_assignments USING btree (quiz_id);


--
-- Name: idx_quiz_assignments_quiz_student; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_quiz_assignments_quiz_student ON public.quiz_assignments USING btree (quiz_id, student_id);


--
-- Name: idx_quiz_assignments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_assignments_status ON public.quiz_assignments USING btree (status);


--
-- Name: idx_quiz_assignments_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_assignments_student_id ON public.quiz_assignments USING btree (student_id);


--
-- Name: idx_quiz_attempts_quiz_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_attempts_quiz_id ON public.quiz_attempts USING btree (quiz_id);


--
-- Name: idx_quiz_attempts_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_attempts_student_id ON public.quiz_attempts USING btree (student_id);


--
-- Name: idx_quiz_items_quiz_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_items_quiz_id ON public.quiz_items USING btree (quiz_id);


--
-- Name: idx_quizzes_school_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quizzes_school_id ON public.quizzes USING btree (school_id);


--
-- Name: idx_quizzes_teacher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quizzes_teacher_id ON public.quizzes USING btree (teacher_id);


--
-- Name: idx_subjects_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subjects_name ON public.subjects USING btree (name);


--
-- Name: idx_teacher_books_book_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_books_book_id ON public.teacher_books USING btree (book_id);


--
-- Name: idx_teacher_books_subject_grade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_books_subject_grade ON public.teacher_books USING btree (subject_id, grade);


--
-- Name: idx_teacher_books_teacher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_books_teacher_id ON public.teacher_books USING btree (teacher_id);


--
-- Name: idx_teacher_books_teacher_subject_grade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_books_teacher_subject_grade ON public.teacher_books USING btree (teacher_id, subject_id, grade);


--
-- Name: idx_user_book_assignments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_book_assignments_user ON public.user_book_assignments USING btree (user_id);


--
-- Name: idx_user_subject_assignments_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_subject_assignments_subject ON public.user_subject_assignments USING btree (subject_id);


--
-- Name: idx_user_subject_grade_assignments_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_subject_grade_assignments_lookup ON public.user_subject_grade_assignments USING btree (user_id, subject_id, grade_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_school_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_school_id ON public.users USING btree (school_id);


--
-- Name: users_firebase_uid_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_firebase_uid_key ON public.users USING btree (firebase_uid) WHERE (firebase_uid IS NOT NULL);


--
-- Name: ux_book_chapters_book_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_book_chapters_book_name ON public.book_chapters USING btree (book_id, lower((chapter_name)::text));


--
-- Name: ux_book_chapters_book_name_ci; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_book_chapters_book_name_ci ON public.book_chapters USING btree (book_id, lower((chapter_name)::text));


--
-- Name: ux_book_chapters_book_no; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_book_chapters_book_no ON public.book_chapters USING btree (book_id, chapter_number);


--
-- Name: ux_books_subject_title_grade; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_books_subject_title_grade ON public.books USING btree (subject_id, lower((title)::text), lower((COALESCE(grade, ''::character varying))::text));


--
-- Name: ux_books_subject_title_grade_ci; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_books_subject_title_grade_ci ON public.books USING btree (subject_id, lower((title)::text), lower((COALESCE(grade, ''::character varying))::text));


--
-- Name: ux_subjects_name_ci; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_subjects_name_ci ON public.subjects USING btree (lower((name)::text));


--
-- Name: book_chapters book_chapters_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_chapters
    ADD CONSTRAINT book_chapters_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: book_grades book_grades_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_grades
    ADD CONSTRAINT book_grades_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: book_grades book_grades_grade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_grades
    ADD CONSTRAINT book_grades_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES public.grades(id) ON DELETE CASCADE;


--
-- Name: books books_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: books books_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: campuses campuses_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campuses
    ADD CONSTRAINT campuses_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: questions questions_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: questions questions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: questions questions_source_school_pk_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_source_school_pk_fkey FOREIGN KEY (source_school_pk) REFERENCES public.schools(id);


--
-- Name: quiz_attempts quiz_attempts_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id);


--
-- Name: quiz_attempts quiz_attempts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: quiz_items quiz_items_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_items
    ADD CONSTRAINT quiz_items_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id);


--
-- Name: quiz_items quiz_items_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_items
    ADD CONSTRAINT quiz_items_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- Name: quizzes quizzes_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: quizzes quizzes_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id);


--
-- Name: subjects subjects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: teacher_books teacher_books_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_books
    ADD CONSTRAINT teacher_books_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: teacher_books teacher_books_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_books
    ADD CONSTRAINT teacher_books_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: teacher_books teacher_books_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_books
    ADD CONSTRAINT teacher_books_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_book_assignments user_book_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_book_assignments
    ADD CONSTRAINT user_book_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_book_assignments user_book_assignments_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_book_assignments
    ADD CONSTRAINT user_book_assignments_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: user_book_assignments user_book_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_book_assignments
    ADD CONSTRAINT user_book_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_subject_assignments user_subject_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subject_assignments
    ADD CONSTRAINT user_subject_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_subject_assignments user_subject_assignments_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subject_assignments
    ADD CONSTRAINT user_subject_assignments_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: user_subject_assignments user_subject_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subject_assignments
    ADD CONSTRAINT user_subject_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_subject_grade_assignments user_subject_grade_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subject_grade_assignments
    ADD CONSTRAINT user_subject_grade_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_subject_grade_assignments user_subject_grade_assignments_grade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subject_grade_assignments
    ADD CONSTRAINT user_subject_grade_assignments_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES public.grades(id) ON DELETE CASCADE;


--
-- Name: user_subject_grade_assignments user_subject_grade_assignments_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subject_grade_assignments
    ADD CONSTRAINT user_subject_grade_assignments_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: user_subject_grade_assignments user_subject_grade_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subject_grade_assignments
    ADD CONSTRAINT user_subject_grade_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict QYezHEtSlar4VVDQT97sWnpiGn1m6HvgA0f5OUhVXe24roz5LO4SxTLFmQUE4YU

