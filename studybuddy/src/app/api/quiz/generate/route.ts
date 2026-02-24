import { insforgeServer } from "@/lib/insforge-server";
import { AI_MODEL, QUIZ_CONFIG } from "@/lib/constants";

export async function POST(request: Request) {
  const { topic } = await request.json();

  if (!topic) {
    return Response.json({ error: "Topic is required" }, { status: 400 });
  }

  const systemPrompt = `You are a quiz generator. Generate exactly ${QUIZ_CONFIG.questionsPerQuiz} multiple-choice questions about "${topic}".

Return ONLY valid JSON in this exact format, with no additional text:
{
  "questions": [
    {
      "id": 1,
      "question": "What is...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0
    }
  ]
}

Rules:
- Each question has exactly 4 options
- correctAnswer is the 0-based index of the correct option
- Questions should range from easy to hard
- Make questions educational and clear
- Cover different aspects of the topic`;

  try {
    const stream = await insforgeServer.ai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a quiz about: ${topic}` },
      ],
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return Response.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
