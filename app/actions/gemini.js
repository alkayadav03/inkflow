"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not configured");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Gemini 3.6 Flash is currently a stable model.
const MODEL_NAME = "gemini-3.6-flash";

/**
 * Remove Markdown code fences if Gemini accidentally returns them.
 */
function cleanAIContent(content) {
  if (!content) return "";

  return content
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/**
 * Generate a completely new blog article.
 */
export async function generateBlogContent(
  title,
  category = "",
  tags = []
) {
  try {
    // Validate title
    if (!title || !title.trim()) {
      throw new Error("Title is required to generate content");
    }

    const cleanTitle = title.trim();

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
    });

    const prompt = `
You are an expert professional blog writer.

IMPORTANT:
The user's title is the ONLY source of truth for the article topic.

ARTICLE TITLE:
"${cleanTitle}"

${category ? `CATEGORY:
"${category}"` : ""}

${tags?.length > 0 ? `TAGS:
${tags.join(", ")}` : ""}

YOUR TASK:

Write a complete blog article specifically about:

"${cleanTitle}"

STRICT TOPIC RULES:

1. The article MUST be about "${cleanTitle}".

2. Every paragraph, heading, example, list and explanation must be
directly related to "${cleanTitle}".

3. NEVER replace the topic with another topic.

4. NEVER write a generic article about blogging, content creation,
content strategy, marketing, productivity or social media unless
"${cleanTitle}" specifically asks for that.

5. If the title contains "earthquake", the article must be about
earthquakes.

6. If the title contains "JavaScript", the article must be about
JavaScript.

7. If the title contains "cyber security", the article must be about
cyber security.

8. Do NOT invent a different topic.

9. Do NOT create another title.

10. Do NOT include the article title in the generated content.

11. Start directly with the introduction.

12. Return ONLY HTML.

13. NEVER return Markdown.

14. NEVER return \`\`\`html.

CONTENT REQUIREMENTS:

- Approximately 600-800 words.
- Start with a clear introduction.
- Use 3-5 main sections.
- Use <h2> for main sections.
- Use <h3> for subsections when useful.
- Use <p> for paragraphs.
- Use <ul> and <li> for lists when appropriate.
- Use <strong> for important points.
- Use <em> when appropriate.
- Include practical examples.
- Include useful and actionable information.
- Keep the writing natural.
- Keep the language easy to understand.
- Keep a professional but conversational tone.

VERY IMPORTANT FINAL CHECK:

Before returning the answer, check every section.

Ask yourself:

"Is this section directly about ${cleanTitle}?"

If NO, remove or rewrite that section.

The final answer must contain ONLY the HTML article.
`;

    const result = await model.generateContent(prompt);

    const response = await result.response;

    const rawContent = response.text();

    const content = cleanAIContent(rawContent);

    if (!content || content.length < 100) {
      throw new Error(
        "Gemini returned empty or very short content"
      );
    }

    return {
      success: true,
      content,
    };
  } catch (error) {
    console.error("Gemini generate error:", error);

    return {
      success: false,
      error:
        error?.message ||
        "Failed to generate blog content. Please try again.",
    };
  }
}

/**
 * Improve existing blog content.
 *
 * IMPORTANT:
 * title is passed separately so Gemini knows exactly
 * what topic it must preserve.
 */
export async function improveContent(
  currentContent,
  improvementType = "enhance",
  title = ""
) {
  try {
    if (!currentContent || !currentContent.trim()) {
      throw new Error(
        "Content is required for improvement"
      );
    }

    const cleanTitle = title?.trim() || "";

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
    });

    let instruction;

    switch (improvementType) {
      case "expand":
        instruction = `
EXPAND the existing article.

- Add useful details.
- Add relevant examples.
- Add practical explanations.
- Add depth to existing sections.
- Keep the same topic.
- Do NOT replace the article with a new unrelated article.
`;
        break;

      case "simplify":
        instruction = `
SIMPLIFY the existing article.

- Make the language easier to understand.
- Keep the important information.
- Remove unnecessary repetition.
- Improve clarity.
- Keep the same topic.
- Do NOT replace the article with a different topic.
`;
        break;

      case "enhance":
      default:
        instruction = `
ENHANCE the existing article.

- Improve readability.
- Improve the introduction.
- Improve transitions.
- Improve explanations.
- Add relevant examples when useful.
- Remove unnecessary repetition.
- Make the article more engaging.
- Keep the same topic.
- Do NOT replace the article with a different topic.
`;
        break;
    }

    const prompt = `
You are an expert professional blog editor.

ORIGINAL ARTICLE TITLE / TOPIC:

"${cleanTitle || "Use the existing article as the topic"}"

EXISTING ARTICLE:

${currentContent}

YOUR TASK:

${instruction}

==================================================
MOST IMPORTANT RULE
==================================================

You are EDITING the existing article.

You are NOT supposed to invent a completely different article.

The original topic MUST remain unchanged.

${cleanTitle
  ? `
The article must remain specifically about:

"${cleanTitle}"

Every heading, paragraph, example and list must remain
relevant to "${cleanTitle}".
`
  : `
Use the existing article itself to determine the topic.
Do not change its subject.
`}

==================================================
DO NOT CHANGE THE TOPIC
==================================================

NEVER turn the article into:

- content strategy
- content marketing
- blogging advice
- social media strategy
- productivity
- generic writing advice
- another unrelated subject

unless that is actually the topic of the existing article.

For example:

If the title is:
"How to Stay Safe During an Earthquake"

then the improved article MUST remain about earthquake safety.

It must NOT become an article about:
"How to Create Better Blog Content."

==================================================
FORMATTING
==================================================

Return ONLY HTML.

Do NOT return Markdown.

Do NOT return \`\`\`html.

Use:

<h2>
<h3>
<p>
<ul>
<li>
<strong>
<em>

Preserve the useful existing structure.

Do not include the article title in the returned content.

==================================================
FINAL QUALITY CHECK
==================================================

Before returning the article, check:

1. Is the topic unchanged?
2. Is every section relevant to the original title?
3. Did you preserve the important information?
4. Did you actually perform "${improvementType}"?
5. Did you accidentally write about content creation or another
unrelated topic?

If any section is unrelated, rewrite it.

Return ONLY the final HTML article.
`;

    const result = await model.generateContent(prompt);

    const response = await result.response;

    const rawContent = response.text();

    const improvedContent = cleanAIContent(rawContent);

    if (!improvedContent || improvedContent.length < 100) {
      throw new Error(
        "Gemini returned empty or very short improved content"
      );
    }

    return {
      success: true,
      content: improvedContent,
    };
  } catch (error) {
    console.error("Gemini improve error:", error);

    return {
      success: false,
      error:
        error?.message ||
        "Failed to improve content. Please try again.",
    };
  }
}