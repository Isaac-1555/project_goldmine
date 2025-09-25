drop trigger if exists "trigger_update_quiz_session_score" on "public"."quiz_question_attempts";

drop trigger if exists "trigger_update_quiz_sets_updated_at" on "public"."quiz_sets";

revoke delete on table "public"."documents" from "anon";

revoke insert on table "public"."documents" from "anon";

revoke references on table "public"."documents" from "anon";

revoke select on table "public"."documents" from "anon";

revoke trigger on table "public"."documents" from "anon";

revoke truncate on table "public"."documents" from "anon";

revoke update on table "public"."documents" from "anon";

revoke delete on table "public"."documents" from "authenticated";

revoke insert on table "public"."documents" from "authenticated";

revoke references on table "public"."documents" from "authenticated";

revoke select on table "public"."documents" from "authenticated";

revoke trigger on table "public"."documents" from "authenticated";

revoke truncate on table "public"."documents" from "authenticated";

revoke update on table "public"."documents" from "authenticated";

revoke delete on table "public"."documents" from "service_role";

revoke insert on table "public"."documents" from "service_role";

revoke references on table "public"."documents" from "service_role";

revoke select on table "public"."documents" from "service_role";

revoke trigger on table "public"."documents" from "service_role";

revoke truncate on table "public"."documents" from "service_role";

revoke update on table "public"."documents" from "service_role";

revoke delete on table "public"."files" from "anon";

revoke insert on table "public"."files" from "anon";

revoke references on table "public"."files" from "anon";

revoke select on table "public"."files" from "anon";

revoke trigger on table "public"."files" from "anon";

revoke truncate on table "public"."files" from "anon";

revoke update on table "public"."files" from "anon";

revoke delete on table "public"."files" from "authenticated";

revoke insert on table "public"."files" from "authenticated";

revoke references on table "public"."files" from "authenticated";

revoke select on table "public"."files" from "authenticated";

revoke trigger on table "public"."files" from "authenticated";

revoke truncate on table "public"."files" from "authenticated";

revoke update on table "public"."files" from "authenticated";

revoke delete on table "public"."files" from "service_role";

revoke insert on table "public"."files" from "service_role";

revoke references on table "public"."files" from "service_role";

revoke select on table "public"."files" from "service_role";

revoke trigger on table "public"."files" from "service_role";

revoke truncate on table "public"."files" from "service_role";

revoke update on table "public"."files" from "service_role";

revoke delete on table "public"."flashcards" from "anon";

revoke insert on table "public"."flashcards" from "anon";

revoke references on table "public"."flashcards" from "anon";

revoke select on table "public"."flashcards" from "anon";

revoke trigger on table "public"."flashcards" from "anon";

revoke truncate on table "public"."flashcards" from "anon";

revoke update on table "public"."flashcards" from "anon";

revoke delete on table "public"."flashcards" from "authenticated";

revoke insert on table "public"."flashcards" from "authenticated";

revoke references on table "public"."flashcards" from "authenticated";

revoke select on table "public"."flashcards" from "authenticated";

revoke trigger on table "public"."flashcards" from "authenticated";

revoke truncate on table "public"."flashcards" from "authenticated";

revoke update on table "public"."flashcards" from "authenticated";

revoke delete on table "public"."flashcards" from "service_role";

revoke insert on table "public"."flashcards" from "service_role";

revoke references on table "public"."flashcards" from "service_role";

revoke select on table "public"."flashcards" from "service_role";

revoke trigger on table "public"."flashcards" from "service_role";

revoke truncate on table "public"."flashcards" from "service_role";

revoke update on table "public"."flashcards" from "service_role";

revoke delete on table "public"."folders" from "anon";

revoke insert on table "public"."folders" from "anon";

revoke references on table "public"."folders" from "anon";

revoke select on table "public"."folders" from "anon";

revoke trigger on table "public"."folders" from "anon";

revoke truncate on table "public"."folders" from "anon";

revoke update on table "public"."folders" from "anon";

revoke delete on table "public"."folders" from "authenticated";

revoke insert on table "public"."folders" from "authenticated";

revoke references on table "public"."folders" from "authenticated";

revoke select on table "public"."folders" from "authenticated";

revoke trigger on table "public"."folders" from "authenticated";

revoke truncate on table "public"."folders" from "authenticated";

revoke update on table "public"."folders" from "authenticated";

revoke delete on table "public"."folders" from "service_role";

revoke insert on table "public"."folders" from "service_role";

revoke references on table "public"."folders" from "service_role";

revoke select on table "public"."folders" from "service_role";

revoke trigger on table "public"."folders" from "service_role";

revoke truncate on table "public"."folders" from "service_role";

revoke update on table "public"."folders" from "service_role";

revoke delete on table "public"."notes" from "anon";

revoke insert on table "public"."notes" from "anon";

revoke references on table "public"."notes" from "anon";

revoke select on table "public"."notes" from "anon";

revoke trigger on table "public"."notes" from "anon";

revoke truncate on table "public"."notes" from "anon";

revoke update on table "public"."notes" from "anon";

revoke delete on table "public"."notes" from "authenticated";

revoke insert on table "public"."notes" from "authenticated";

revoke references on table "public"."notes" from "authenticated";

revoke select on table "public"."notes" from "authenticated";

revoke trigger on table "public"."notes" from "authenticated";

revoke truncate on table "public"."notes" from "authenticated";

revoke update on table "public"."notes" from "authenticated";

revoke delete on table "public"."notes" from "service_role";

revoke insert on table "public"."notes" from "service_role";

revoke references on table "public"."notes" from "service_role";

revoke select on table "public"."notes" from "service_role";

revoke trigger on table "public"."notes" from "service_role";

revoke truncate on table "public"."notes" from "service_role";

revoke update on table "public"."notes" from "service_role";

revoke delete on table "public"."quiz_attempts" from "anon";

revoke insert on table "public"."quiz_attempts" from "anon";

revoke references on table "public"."quiz_attempts" from "anon";

revoke select on table "public"."quiz_attempts" from "anon";

revoke trigger on table "public"."quiz_attempts" from "anon";

revoke truncate on table "public"."quiz_attempts" from "anon";

revoke update on table "public"."quiz_attempts" from "anon";

revoke delete on table "public"."quiz_attempts" from "authenticated";

revoke insert on table "public"."quiz_attempts" from "authenticated";

revoke references on table "public"."quiz_attempts" from "authenticated";

revoke select on table "public"."quiz_attempts" from "authenticated";

revoke trigger on table "public"."quiz_attempts" from "authenticated";

revoke truncate on table "public"."quiz_attempts" from "authenticated";

revoke update on table "public"."quiz_attempts" from "authenticated";

revoke delete on table "public"."quiz_attempts" from "service_role";

revoke insert on table "public"."quiz_attempts" from "service_role";

revoke references on table "public"."quiz_attempts" from "service_role";

revoke select on table "public"."quiz_attempts" from "service_role";

revoke trigger on table "public"."quiz_attempts" from "service_role";

revoke truncate on table "public"."quiz_attempts" from "service_role";

revoke update on table "public"."quiz_attempts" from "service_role";

revoke delete on table "public"."quiz_question_attempts" from "anon";

revoke insert on table "public"."quiz_question_attempts" from "anon";

revoke references on table "public"."quiz_question_attempts" from "anon";

revoke select on table "public"."quiz_question_attempts" from "anon";

revoke trigger on table "public"."quiz_question_attempts" from "anon";

revoke truncate on table "public"."quiz_question_attempts" from "anon";

revoke update on table "public"."quiz_question_attempts" from "anon";

revoke delete on table "public"."quiz_question_attempts" from "authenticated";

revoke insert on table "public"."quiz_question_attempts" from "authenticated";

revoke references on table "public"."quiz_question_attempts" from "authenticated";

revoke select on table "public"."quiz_question_attempts" from "authenticated";

revoke trigger on table "public"."quiz_question_attempts" from "authenticated";

revoke truncate on table "public"."quiz_question_attempts" from "authenticated";

revoke update on table "public"."quiz_question_attempts" from "authenticated";

revoke delete on table "public"."quiz_question_attempts" from "service_role";

revoke insert on table "public"."quiz_question_attempts" from "service_role";

revoke references on table "public"."quiz_question_attempts" from "service_role";

revoke select on table "public"."quiz_question_attempts" from "service_role";

revoke trigger on table "public"."quiz_question_attempts" from "service_role";

revoke truncate on table "public"."quiz_question_attempts" from "service_role";

revoke update on table "public"."quiz_question_attempts" from "service_role";

revoke delete on table "public"."quiz_questions" from "anon";

revoke insert on table "public"."quiz_questions" from "anon";

revoke references on table "public"."quiz_questions" from "anon";

revoke select on table "public"."quiz_questions" from "anon";

revoke trigger on table "public"."quiz_questions" from "anon";

revoke truncate on table "public"."quiz_questions" from "anon";

revoke update on table "public"."quiz_questions" from "anon";

revoke delete on table "public"."quiz_questions" from "authenticated";

revoke insert on table "public"."quiz_questions" from "authenticated";

revoke references on table "public"."quiz_questions" from "authenticated";

revoke select on table "public"."quiz_questions" from "authenticated";

revoke trigger on table "public"."quiz_questions" from "authenticated";

revoke truncate on table "public"."quiz_questions" from "authenticated";

revoke update on table "public"."quiz_questions" from "authenticated";

revoke delete on table "public"."quiz_questions" from "service_role";

revoke insert on table "public"."quiz_questions" from "service_role";

revoke references on table "public"."quiz_questions" from "service_role";

revoke select on table "public"."quiz_questions" from "service_role";

revoke trigger on table "public"."quiz_questions" from "service_role";

revoke truncate on table "public"."quiz_questions" from "service_role";

revoke update on table "public"."quiz_questions" from "service_role";

revoke delete on table "public"."quiz_sessions" from "anon";

revoke insert on table "public"."quiz_sessions" from "anon";

revoke references on table "public"."quiz_sessions" from "anon";

revoke select on table "public"."quiz_sessions" from "anon";

revoke trigger on table "public"."quiz_sessions" from "anon";

revoke truncate on table "public"."quiz_sessions" from "anon";

revoke update on table "public"."quiz_sessions" from "anon";

revoke delete on table "public"."quiz_sessions" from "authenticated";

revoke insert on table "public"."quiz_sessions" from "authenticated";

revoke references on table "public"."quiz_sessions" from "authenticated";

revoke select on table "public"."quiz_sessions" from "authenticated";

revoke trigger on table "public"."quiz_sessions" from "authenticated";

revoke truncate on table "public"."quiz_sessions" from "authenticated";

revoke update on table "public"."quiz_sessions" from "authenticated";

revoke delete on table "public"."quiz_sessions" from "service_role";

revoke insert on table "public"."quiz_sessions" from "service_role";

revoke references on table "public"."quiz_sessions" from "service_role";

revoke select on table "public"."quiz_sessions" from "service_role";

revoke trigger on table "public"."quiz_sessions" from "service_role";

revoke truncate on table "public"."quiz_sessions" from "service_role";

revoke update on table "public"."quiz_sessions" from "service_role";

revoke delete on table "public"."quiz_sets" from "anon";

revoke insert on table "public"."quiz_sets" from "anon";

revoke references on table "public"."quiz_sets" from "anon";

revoke select on table "public"."quiz_sets" from "anon";

revoke trigger on table "public"."quiz_sets" from "anon";

revoke truncate on table "public"."quiz_sets" from "anon";

revoke update on table "public"."quiz_sets" from "anon";

revoke delete on table "public"."quiz_sets" from "authenticated";

revoke insert on table "public"."quiz_sets" from "authenticated";

revoke references on table "public"."quiz_sets" from "authenticated";

revoke select on table "public"."quiz_sets" from "authenticated";

revoke trigger on table "public"."quiz_sets" from "authenticated";

revoke truncate on table "public"."quiz_sets" from "authenticated";

revoke update on table "public"."quiz_sets" from "authenticated";

revoke delete on table "public"."quiz_sets" from "service_role";

revoke insert on table "public"."quiz_sets" from "service_role";

revoke references on table "public"."quiz_sets" from "service_role";

revoke select on table "public"."quiz_sets" from "service_role";

revoke trigger on table "public"."quiz_sets" from "service_role";

revoke truncate on table "public"."quiz_sets" from "service_role";

revoke update on table "public"."quiz_sets" from "service_role";

revoke delete on table "public"."quizzes" from "anon";

revoke insert on table "public"."quizzes" from "anon";

revoke references on table "public"."quizzes" from "anon";

revoke select on table "public"."quizzes" from "anon";

revoke trigger on table "public"."quizzes" from "anon";

revoke truncate on table "public"."quizzes" from "anon";

revoke update on table "public"."quizzes" from "anon";

revoke delete on table "public"."quizzes" from "authenticated";

revoke insert on table "public"."quizzes" from "authenticated";

revoke references on table "public"."quizzes" from "authenticated";

revoke select on table "public"."quizzes" from "authenticated";

revoke trigger on table "public"."quizzes" from "authenticated";

revoke truncate on table "public"."quizzes" from "authenticated";

revoke update on table "public"."quizzes" from "authenticated";

revoke delete on table "public"."quizzes" from "service_role";

revoke insert on table "public"."quizzes" from "service_role";

revoke references on table "public"."quizzes" from "service_role";

revoke select on table "public"."quizzes" from "service_role";

revoke trigger on table "public"."quizzes" from "service_role";

revoke truncate on table "public"."quizzes" from "service_role";

revoke update on table "public"."quizzes" from "service_role";

revoke delete on table "public"."summaries" from "anon";

revoke insert on table "public"."summaries" from "anon";

revoke references on table "public"."summaries" from "anon";

revoke select on table "public"."summaries" from "anon";

revoke trigger on table "public"."summaries" from "anon";

revoke truncate on table "public"."summaries" from "anon";

revoke update on table "public"."summaries" from "anon";

revoke delete on table "public"."summaries" from "authenticated";

revoke insert on table "public"."summaries" from "authenticated";

revoke references on table "public"."summaries" from "authenticated";

revoke select on table "public"."summaries" from "authenticated";

revoke trigger on table "public"."summaries" from "authenticated";

revoke truncate on table "public"."summaries" from "authenticated";

revoke update on table "public"."summaries" from "authenticated";

revoke delete on table "public"."summaries" from "service_role";

revoke insert on table "public"."summaries" from "service_role";

revoke references on table "public"."summaries" from "service_role";

revoke select on table "public"."summaries" from "service_role";

revoke trigger on table "public"."summaries" from "service_role";

revoke truncate on table "public"."summaries" from "service_role";

revoke update on table "public"."summaries" from "service_role";

revoke delete on table "public"."summary_tags" from "anon";

revoke insert on table "public"."summary_tags" from "anon";

revoke references on table "public"."summary_tags" from "anon";

revoke select on table "public"."summary_tags" from "anon";

revoke trigger on table "public"."summary_tags" from "anon";

revoke truncate on table "public"."summary_tags" from "anon";

revoke update on table "public"."summary_tags" from "anon";

revoke delete on table "public"."summary_tags" from "authenticated";

revoke insert on table "public"."summary_tags" from "authenticated";

revoke references on table "public"."summary_tags" from "authenticated";

revoke select on table "public"."summary_tags" from "authenticated";

revoke trigger on table "public"."summary_tags" from "authenticated";

revoke truncate on table "public"."summary_tags" from "authenticated";

revoke update on table "public"."summary_tags" from "authenticated";

revoke delete on table "public"."summary_tags" from "service_role";

revoke insert on table "public"."summary_tags" from "service_role";

revoke references on table "public"."summary_tags" from "service_role";

revoke select on table "public"."summary_tags" from "service_role";

revoke trigger on table "public"."summary_tags" from "service_role";

revoke truncate on table "public"."summary_tags" from "service_role";

revoke update on table "public"."summary_tags" from "service_role";

revoke delete on table "public"."tags" from "anon";

revoke insert on table "public"."tags" from "anon";

revoke references on table "public"."tags" from "anon";

revoke select on table "public"."tags" from "anon";

revoke trigger on table "public"."tags" from "anon";

revoke truncate on table "public"."tags" from "anon";

revoke update on table "public"."tags" from "anon";

revoke delete on table "public"."tags" from "authenticated";

revoke insert on table "public"."tags" from "authenticated";

revoke references on table "public"."tags" from "authenticated";

revoke select on table "public"."tags" from "authenticated";

revoke trigger on table "public"."tags" from "authenticated";

revoke truncate on table "public"."tags" from "authenticated";

revoke update on table "public"."tags" from "authenticated";

revoke delete on table "public"."tags" from "service_role";

revoke insert on table "public"."tags" from "service_role";

revoke references on table "public"."tags" from "service_role";

revoke select on table "public"."tags" from "service_role";

revoke trigger on table "public"."tags" from "service_role";

revoke truncate on table "public"."tags" from "service_role";

revoke update on table "public"."tags" from "service_role";

revoke delete on table "public"."transcripts" from "anon";

revoke insert on table "public"."transcripts" from "anon";

revoke references on table "public"."transcripts" from "anon";

revoke select on table "public"."transcripts" from "anon";

revoke trigger on table "public"."transcripts" from "anon";

revoke truncate on table "public"."transcripts" from "anon";

revoke update on table "public"."transcripts" from "anon";

revoke delete on table "public"."transcripts" from "authenticated";

revoke insert on table "public"."transcripts" from "authenticated";

revoke references on table "public"."transcripts" from "authenticated";

revoke select on table "public"."transcripts" from "authenticated";

revoke trigger on table "public"."transcripts" from "authenticated";

revoke truncate on table "public"."transcripts" from "authenticated";

revoke update on table "public"."transcripts" from "authenticated";

revoke delete on table "public"."transcripts" from "service_role";

revoke insert on table "public"."transcripts" from "service_role";

revoke references on table "public"."transcripts" from "service_role";

revoke select on table "public"."transcripts" from "service_role";

revoke trigger on table "public"."transcripts" from "service_role";

revoke truncate on table "public"."transcripts" from "service_role";

revoke update on table "public"."transcripts" from "service_role";

revoke delete on table "public"."users" from "anon";

revoke insert on table "public"."users" from "anon";

revoke references on table "public"."users" from "anon";

revoke select on table "public"."users" from "anon";

revoke trigger on table "public"."users" from "anon";

revoke truncate on table "public"."users" from "anon";

revoke update on table "public"."users" from "anon";

revoke delete on table "public"."users" from "authenticated";

revoke insert on table "public"."users" from "authenticated";

revoke references on table "public"."users" from "authenticated";

revoke select on table "public"."users" from "authenticated";

revoke trigger on table "public"."users" from "authenticated";

revoke truncate on table "public"."users" from "authenticated";

revoke update on table "public"."users" from "authenticated";

revoke delete on table "public"."users" from "service_role";

revoke insert on table "public"."users" from "service_role";

revoke references on table "public"."users" from "service_role";

revoke select on table "public"."users" from "service_role";

revoke trigger on table "public"."users" from "service_role";

revoke truncate on table "public"."users" from "service_role";

revoke update on table "public"."users" from "service_role";

alter table "public"."quiz_question_attempts" drop constraint "quiz_question_attempts_quiz_question_id_fkey";

alter table "public"."quiz_question_attempts" drop constraint "quiz_question_attempts_quiz_session_id_fkey";

alter table "public"."quiz_question_attempts" drop constraint "quiz_question_attempts_quiz_session_id_quiz_question_id_key";

alter table "public"."quiz_questions" drop constraint "quiz_questions_difficulty_level_check";

alter table "public"."quiz_questions" drop constraint "quiz_questions_question_type_check";

alter table "public"."quiz_questions" drop constraint "quiz_questions_quiz_set_id_fkey";

alter table "public"."quiz_sessions" drop constraint "quiz_sessions_quiz_set_id_fkey";

alter table "public"."quiz_sessions" drop constraint "quiz_sessions_session_status_check";

alter table "public"."quiz_sets" drop constraint "quiz_sets_difficulty_level_check";

alter table "public"."quiz_sets" drop constraint "quiz_sets_user_id_fkey";

drop function if exists "public"."get_user_quiz_statistics"(user_uuid uuid);

drop function if exists "public"."get_user_recent_quiz_performance"(user_uuid uuid);

drop function if exists "public"."update_quiz_session_score"();

drop function if exists "public"."update_quiz_sets_updated_at"();

alter table "public"."quiz_question_attempts" drop constraint "quiz_question_attempts_pkey";

alter table "public"."quiz_sets" drop constraint "quiz_sets_pkey";

drop index if exists "public"."idx_quiz_question_attempts_question_id";

drop index if exists "public"."idx_quiz_question_attempts_session_id";

drop index if exists "public"."idx_quiz_questions_order";

drop index if exists "public"."idx_quiz_questions_quiz_set_id";

drop index if exists "public"."idx_quiz_sessions_completed_at";

drop index if exists "public"."idx_quiz_sessions_quiz_set_id";

drop index if exists "public"."idx_quiz_sessions_status";

drop index if exists "public"."idx_quiz_sets_created_at";

drop index if exists "public"."idx_quiz_sets_summary_ids";

drop index if exists "public"."idx_quiz_sets_user_id";

drop index if exists "public"."quiz_question_attempts_pkey";

drop index if exists "public"."quiz_question_attempts_quiz_session_id_quiz_question_id_key";

drop index if exists "public"."quiz_sets_pkey";

drop table "public"."quiz_question_attempts";

drop table "public"."quiz_sets";

create table "public"."quiz_results" (
    "id" uuid not null default gen_random_uuid(),
    "session_id" uuid not null,
    "user_id" uuid not null,
    "answers" jsonb not null,
    "score" integer not null,
    "total" integer not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."quiz_results" enable row level security;

alter table "public"."documents" alter column "file_type" set data type character varying(255) using "file_type"::character varying(255);

alter table "public"."files" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."flashcards" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."folders" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."quiz_attempts" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."quiz_questions" drop column "correct_answer_index";

alter table "public"."quiz_questions" drop column "created_at";

alter table "public"."quiz_questions" drop column "difficulty_level";

alter table "public"."quiz_questions" drop column "options";

alter table "public"."quiz_questions" drop column "question_order";

alter table "public"."quiz_questions" drop column "question_text";

alter table "public"."quiz_questions" drop column "question_type";

alter table "public"."quiz_questions" drop column "quiz_set_id";

alter table "public"."quiz_questions" add column "answer_bool" boolean;

alter table "public"."quiz_questions" add column "answer_text" text;

alter table "public"."quiz_questions" add column "choices" text[];

alter table "public"."quiz_questions" add column "correct_index" integer;

alter table "public"."quiz_questions" add column "position" integer not null default 0;

alter table "public"."quiz_questions" add column "prompt" text not null;

alter table "public"."quiz_questions" add column "session_id" uuid not null;

alter table "public"."quiz_questions" add column "sources" jsonb;

alter table "public"."quiz_questions" add column "type" text not null;

alter table "public"."quiz_questions" alter column "id" set default gen_random_uuid();

alter table "public"."quiz_questions" enable row level security;

alter table "public"."quiz_sessions" drop column "completed_at";

alter table "public"."quiz_sessions" drop column "correct_answers";

alter table "public"."quiz_sessions" drop column "quiz_set_id";

alter table "public"."quiz_sessions" drop column "score_percentage";

alter table "public"."quiz_sessions" drop column "session_status";

alter table "public"."quiz_sessions" drop column "started_at";

alter table "public"."quiz_sessions" drop column "time_spent_seconds";

alter table "public"."quiz_sessions" drop column "total_questions";

alter table "public"."quiz_sessions" add column "config" jsonb not null;

alter table "public"."quiz_sessions" add column "error" text;

alter table "public"."quiz_sessions" add column "file_ids" uuid[] not null;

alter table "public"."quiz_sessions" add column "status" text not null default 'ready'::text;

alter table "public"."quiz_sessions" add column "updated_at" timestamp with time zone default now();

alter table "public"."quiz_sessions" alter column "id" set default gen_random_uuid();

alter table "public"."quiz_sessions" enable row level security;

alter table "public"."quizzes" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."summaries" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."tags" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."transcripts" alter column "id" set default extensions.uuid_generate_v4();

CREATE INDEX idx_quiz_questions_session_id ON public.quiz_questions USING btree (session_id);

CREATE INDEX idx_quiz_results_session_id ON public.quiz_results USING btree (session_id);

CREATE UNIQUE INDEX quiz_results_pkey ON public.quiz_results USING btree (id);

alter table "public"."quiz_results" add constraint "quiz_results_pkey" PRIMARY KEY using index "quiz_results_pkey";

alter table "public"."quiz_questions" add constraint "quiz_questions_session_id_fkey" FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_questions" validate constraint "quiz_questions_session_id_fkey";

alter table "public"."quiz_questions" add constraint "quiz_questions_type_check" CHECK ((type = ANY (ARRAY['mcq'::text, 'true-false'::text, 'fill-blank'::text, 'short-answer'::text]))) not valid;

alter table "public"."quiz_questions" validate constraint "quiz_questions_type_check";

alter table "public"."quiz_results" add constraint "quiz_results_session_id_fkey" FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_results" validate constraint "quiz_results_session_id_fkey";

alter table "public"."quiz_results" add constraint "quiz_results_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_results" validate constraint "quiz_results_user_id_fkey";

alter table "public"."quiz_sessions" add constraint "quiz_sessions_status_check" CHECK ((status = ANY (ARRAY['queued'::text, 'generating'::text, 'ready'::text, 'error'::text]))) not valid;

alter table "public"."quiz_sessions" validate constraint "quiz_sessions_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_knowledge_graph_data(user_uuid uuid)
 RETURNS TABLE(summary_id uuid, file_title text, summary_text text, tags text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as summary_id,
        f.title as file_title,
        s.summary_text,
        ARRAY_AGG(t.name) as tags
    FROM public.summaries s
    JOIN public.files f ON s.file_id = f.id
    LEFT JOIN public.summary_tags st ON s.id = st.summary_id
    LEFT JOIN public.tags t ON st.tag_id = t.id
    WHERE f.user_id = user_uuid
    GROUP BY s.id, f.title, s.summary_text
    HAVING COUNT(t.id) > 0
    ORDER BY f.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_tag_suggestions(search_term text)
 RETURNS TABLE(name text, usage_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.name,
    COUNT(st.summary_id) as usage_count
  FROM tags t
  LEFT JOIN summary_tags st ON t.id = st.tag_id
  WHERE t.name ILIKE '%' || search_term || '%'
  GROUP BY t.id, t.name
  ORDER BY usage_count DESC, t.name ASC
  LIMIT 10;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_files_with_metadata(user_uuid uuid)
 RETURNS TABLE(file_id uuid, title text, file_type text, status text, created_at timestamp with time zone, folder_name text, summary_text text, tags text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        f.id as file_id,
        f.title,
        f.file_type,
        f.status,
        f.created_at,
        fo.name as folder_name,
        s.summary_text,
        ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL) as tags
    FROM public.files f
    LEFT JOIN public.folders fo ON f.folder_id = fo.id
    LEFT JOIN public.summaries s ON f.id = s.file_id
    LEFT JOIN public.summary_tags st ON s.id = st.summary_id
    LEFT JOIN public.tags t ON st.tag_id = t.id
    WHERE f.user_id = user_uuid
    GROUP BY f.id, f.title, f.file_type, f.status, f.created_at, fo.name, s.summary_text
    ORDER BY f.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_files_by_tags(user_uuid uuid, tag_names text[], search_logic text DEFAULT 'and'::text)
 RETURNS TABLE(file_id uuid, title text, file_type text, status text, created_at timestamp with time zone, folder_name text, summary_text text, tags text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF search_logic = 'and' THEN
    -- AND logic: files must have ALL specified tags
    RETURN QUERY
    SELECT 
      f.id as file_id,
      f.title,
      f.file_type,
      f.status,
      f.created_at,
      fo.name as folder_name,
      s.summary_text,
      ARRAY_AGG(DISTINCT t.name) as tags
    FROM files f
    LEFT JOIN folders fo ON f.folder_id = fo.id
    JOIN summaries s ON f.id = s.file_id
    JOIN summary_tags st ON s.id = st.summary_id
    JOIN tags t ON st.tag_id = t.id
    WHERE f.user_id = user_uuid
      AND f.status = 'completed'
      AND s.id IN (
        SELECT st2.summary_id
        FROM summary_tags st2
        JOIN tags t2 ON st2.tag_id = t2.id
        WHERE t2.name = ANY(tag_names)
        GROUP BY st2.summary_id
        HAVING COUNT(DISTINCT t2.name) = array_length(tag_names, 1)
      )
    GROUP BY f.id, f.title, f.file_type, f.status, f.created_at, fo.name, s.summary_text, s.created_at
    ORDER BY s.created_at DESC;
  ELSE
    -- OR logic: files must have ANY of the specified tags
    RETURN QUERY
    SELECT 
      f.id as file_id,
      f.title,
      f.file_type,
      f.status,
      f.created_at,
      fo.name as folder_name,
      s.summary_text,
      ARRAY_AGG(DISTINCT t.name) as tags
    FROM files f
    LEFT JOIN folders fo ON f.folder_id = fo.id
    JOIN summaries s ON f.id = s.file_id
    JOIN summary_tags st ON s.id = st.summary_id
    JOIN tags t ON st.tag_id = t.id
    WHERE f.user_id = user_uuid
      AND f.status = 'completed'
      AND t.name = ANY(tag_names)
    GROUP BY f.id, f.title, f.file_type, f.status, f.created_at, fo.name, s.summary_text, s.created_at
    ORDER BY s.created_at DESC;
  END IF;
END;
$function$
;

create policy "Users manage questions of own sessions"
on "public"."quiz_questions"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM quiz_sessions s
  WHERE ((s.id = quiz_questions.session_id) AND (s.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM quiz_sessions s
  WHERE ((s.id = quiz_questions.session_id) AND (s.user_id = auth.uid())))));


create policy "Users manage own quiz results"
on "public"."quiz_results"
as permissive
for all
to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


create policy "Users manage own quiz sessions"
on "public"."quiz_sessions"
as permissive
for all
to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


CREATE TRIGGER trg_quiz_sessions_updated_at BEFORE UPDATE ON public.quiz_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();


