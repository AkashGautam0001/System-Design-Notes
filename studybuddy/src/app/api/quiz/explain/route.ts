import { insforgeServer } from "@/lib/insforge-server";
import { AI_MODEL } from "@/lib/constants";

export async function POST(request: Request) {
  const { question, userAnswer, correctAnswer } = await request.json();

  if (!question) {
    return Response.json({ error: "Question is required" }, { status: 400 });
  }

  try {
    const stream = await insforgeServer.ai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful tutor. Explain why the correct answer is right and why the user's answer was wrong. Be concise but educational. Use 2-3 sentences max.",
        },
        {
          role: "user",
          content: `Question: ${question}\nUser's answer: ${userAnswer}\nCorrect answer: ${correctAnswer}\n\nExplain why the correct answer is right.`,
        },
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
    console.error("Explanation error:", error);
    return Response.json(
      { error: "Failed to generate explanation" },
      { status: 500 }
    );
  }
}
