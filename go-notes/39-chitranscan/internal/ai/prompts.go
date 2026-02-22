// ============================================================
//  Package ai — Prompt Templates for Gemini Vision
// ============================================================
//  WHY SEPARATE PROMPTS?
//  Prompt engineering is a discipline. Storing prompts as
//  constants (not inline strings) means:
//    1. Version control — see how prompts evolved over time
//    2. Reuse — multiple handlers can share the same prompt
//    3. Testing — swap prompts without changing logic
//    4. Review — product managers can review prompts in PRs
//
//  BigBasket analogy: The QC checklist is printed on a card
//  that every inspector carries. When HQ updates the checklist
//  (e.g., adds "check for artificial ripening"), they print
//  new cards — they don't retrain every inspector from scratch.
//
//  PROMPT ENGINEERING TIPS (from real Gemini usage):
//  ─────────────────────────────────────────────────
//  1. Be specific: "rate freshness from 0-10" > "is it fresh?"
//  2. Request structure: "respond in JSON" > free-form text
//  3. Give examples: few-shot prompting improves consistency
//  4. Set persona: "You are a food quality inspector" focuses
//     the model's knowledge domain
//  5. Constrain output: "respond ONLY with the JSON" prevents
//     the model from adding pleasantries
// ============================================================

package ai

// ──────────────────────────────────────────────────────────────
// Quality Check Prompt
// ──────────────────────────────────────────────────────────────
// Used when BigBasket inspects incoming produce — mangoes,
// tomatoes, onions, bananas. The model acts as a trained food
// scientist examining a photograph.

const QualityCheckPrompt = `You are an expert food quality inspector for a large Indian grocery warehouse.

Analyze this produce image and provide:
1. FRESHNESS SCORE: Rate from 0.0 (rotten) to 1.0 (perfectly fresh)
2. DEFECTS: List any visible defects (bruises, mold, discoloration, pest damage)
3. GRADE: Assign one of: A (premium), B (good, minor issues), C (acceptable, discount), Reject (do not sell)
4. NOTES: Any additional observations relevant to warehouse quality control

Respond in this exact JSON format:
{
  "freshness_score": 0.85,
  "defect_detected": false,
  "defect_description": "",
  "grade": "A",
  "findings": "Fresh Alphonso mangoes, uniform golden-yellow color, firm texture, no visible bruises or mold."
}`

// ──────────────────────────────────────────────────────────────
// Label Reading Prompt
// ──────────────────────────────────────────────────────────────
// Used for packaged goods — reading MRP, expiry dates, FSSAI
// numbers, ingredients. Critical for compliance in India where
// FSSAI regulations are strict.

const LabelReadPrompt = `You are a product label reader for an Indian grocery warehouse.

Extract ALL text visible on this product label, with special attention to:
1. PRODUCT NAME
2. BRAND
3. MRP (Maximum Retail Price)
4. EXPIRY DATE / BEST BEFORE
5. FSSAI LICENSE NUMBER
6. INGREDIENTS (if visible)
7. NET WEIGHT
8. MANUFACTURER ADDRESS

Respond in this exact JSON format:
{
  "labels": ["Product Name: ...", "Brand: ...", "MRP: ...", "Expiry: ...", "FSSAI: ..."],
  "findings": "Summary of all extracted label information"
}`

// ──────────────────────────────────────────────────────────────
// Categorization Prompt
// ──────────────────────────────────────────────────────────────
// Used for automated warehouse sorting. When a new product
// arrives without a barcode scan, the image tells the system
// which aisle and shelf it belongs to.

const CategorizePrompt = `You are a product categorization expert for an Indian grocery warehouse.

Categorize this product image into ONE of these categories:
- Fruits
- Vegetables
- Dairy
- Grains & Pulses
- Spices & Masala
- Beverages
- Snacks & Packaged Foods
- Personal Care
- Household
- Other

Also provide sub-category and confidence level.

Respond in this exact JSON format:
{
  "category": "Fruits",
  "sub_category": "Tropical Fruits",
  "confidence": 0.95,
  "findings": "Image shows ripe Alphonso mangoes, a premium tropical fruit commonly sourced from Ratnagiri, Maharashtra."
}`
