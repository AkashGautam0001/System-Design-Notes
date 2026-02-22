// ============================================================
//  PACKAGE ai — Prompt Templates for RAG Pipeline
// ============================================================
//  WHY: Prompts are the "code" of AI applications. Just as TCS
//  has coding standards for Java and Go, RAG systems need prompt
//  standards. A well-structured prompt is the difference between
//  "I don't know" and a precise, cited answer.
//
//  PROMPT ENGINEERING INSIGHT: The prompt tells the LLM its role,
//  provides context, asks the question, and specifies output
//  format. Change any of these and the answer quality changes
//  dramatically. Treat prompts as versioned, tested artifacts.
// ============================================================

package ai

// ──────────────────────────────────────────────────────────────
// RAG Answer Prompt — the core template for generating answers.
// WHY this structure?
// 1. ROLE: Sets the LLM's persona (TCS knowledge assistant)
// 2. CONTEXT: Provides retrieved document chunks
// 3. QUESTION: The user's original question
// 4. RULES: Constraints on how to answer (cite sources, stay factual)
// ──────────────────────────────────────────────────────────────

// RAGAnswerPrompt is the template used to generate answers from retrieved context.
const RAGAnswerPrompt = `You are GyaanKhoj, TCS's internal knowledge assistant.
Answer the question based ONLY on the provided context passages.
If the context does not contain enough information, say "I don't have enough information to answer this question based on the available documents."

CONTEXT PASSAGES:
%s

QUESTION: %s

RULES:
1. Use ONLY information from the context passages above.
2. Cite sources using [1], [2], etc. corresponding to the passage numbers.
3. Be concise but thorough.
4. If multiple passages are relevant, synthesize them into a coherent answer.
5. Never make up information not present in the context.

ANSWER:`

// ──────────────────────────────────────────────────────────────
// Document Summarization Prompt — for generating document summaries.
// Used when ingesting long documents to create a quick overview.
// ──────────────────────────────────────────────────────────────

// SummarizationPrompt is used to generate summaries of ingested documents.
const SummarizationPrompt = `Summarize the following TCS internal document in 2-3 sentences.
Focus on the key takeaways that would help an employee decide if this document is relevant to their question.

DOCUMENT TITLE: %s

DOCUMENT CONTENT:
%s

SUMMARY:`

// ──────────────────────────────────────────────────────────────
// Query Refinement Prompt — for improving search queries.
// WHY? Users often type vague queries. "deployment" might mean
// CI/CD pipelines, Kubernetes setup, or release procedures.
// Query refinement adds specificity.
// ──────────────────────────────────────────────────────────────

// QueryRefinementPrompt is used to expand or refine a user's search query.
const QueryRefinementPrompt = `Given the following search query for TCS's internal knowledge base, generate a more specific and detailed version that would help find relevant documents.

ORIGINAL QUERY: %s

REFINED QUERY:`
