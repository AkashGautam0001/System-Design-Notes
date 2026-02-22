package handler

// ============================================================
// Seed Data — Realistic Jio Call Center Transcripts
// ============================================================
// These sample transcripts simulate real conversations from
// Jio's call centers across India. They cover common scenarios:
// complaints, inquiries, upgrades, and positive feedback.
//
// WHY seed data? Two reasons:
// 1. Developers can immediately see VaaniSutra in action
//    without crafting test data manually.
// 2. The AI simulation algorithms are tuned for this type of
//    text — seeing them produce realistic sentiment scores and
//    entity extractions on realistic data builds confidence.
//
// Each transcript is 100-200 words in realistic dialogue format,
// as if transcribed from an actual Jio customer call.
// ============================================================

import "vaanisutra/internal/model"

// SampleTranscripts returns realistic Jio call center transcripts
// for testing and demonstration purposes.
func SampleTranscripts() []model.SubmitRequest {
	return []model.SubmitRequest{
		// ──────────────────────────────────────────────────────────
		// 1. Complaint about slow internet
		// Sentiment: Negative | Entities: Plan, Issue, Location
		// ──────────────────────────────────────────────────────────
		{
			CallerID: "JIO-9876543210",
			AgentID:  "AGT-101",
			Content: `Customer: Hello, I am calling because my internet has been extremely slow for the past week. I have the Jio ₹999 plan and I am supposed to get 150 Mbps speed but I am barely getting 10 Mbps. This is terrible and I am very frustrated.
Agent: I understand your frustration sir. Let me check your connection details. I can see you are in Mumbai. There has been some maintenance work in your area.
Customer: Maintenance for one whole week? This is pathetic. I am paying good money for this service and getting nothing in return. I want this fixed immediately or I will switch to Airtel.
Agent: I completely understand. Let me escalate this to our network team. You should see improvement within 24 hours. I am also applying a credit of ₹200 to your account for the inconvenience.
Customer: Fine, but if it is not fixed by tomorrow I am done with Jio.`,
			Duration: 245,
			Language: "en",
		},

		// ──────────────────────────────────────────────────────────
		// 2. Plan upgrade inquiry
		// Sentiment: Neutral | Entities: Plan, Product
		// ──────────────────────────────────────────────────────────
		{
			CallerID: "JIO-8765432109",
			AgentID:  "AGT-205",
			Content: `Customer: Hi, I want to know about upgrading my current plan. I am currently on the Jio ₹599 plan and I want to know what options I have for a better plan with more data.
Agent: Sure, I would be happy to help you with plan options. We have the Jio ₹999 plan that gives you 2GB per day with unlimited calls, and the Jio ₹1499 plan with 3GB per day plus JioTV and JioCinema premium access.
Customer: What about JioFiber? I have been thinking about getting a home broadband connection as well.
Agent: Great choice! JioFiber plans start at ₹699 per month for 30 Mbps and go up to ₹3999 for 1 Gbps. All plans include JioTV, JioCinema, and JioSaavn premium.
Customer: Let me think about the ₹1499 plan for my mobile and maybe the JioFiber ₹999 plan for home. Can you send me the details on WhatsApp?
Agent: Absolutely! I will send the plan comparison to your registered number right away.`,
			Duration: 310,
			Language: "en",
		},

		// ──────────────────────────────────────────────────────────
		// 3. Billing dispute
		// Sentiment: Negative | Entities: Amount, Issue
		// ──────────────────────────────────────────────────────────
		{
			CallerID: "JIO-7654321098",
			AgentID:  "AGT-312",
			Content: `Customer: I have been charged ₹1499 on my account but I never upgraded my plan. I am on the ₹599 plan and have been for six months. This is wrong and I want a refund immediately.
Agent: I apologize for the inconvenience. Let me look into your billing history. I can see that on the 15th of last month there was a plan change request.
Customer: I never made any plan change request! This is a billing error on your side. I am very angry about this. You cannot just charge people without their consent.
Agent: You are absolutely right, and I sincerely apologize. I can see this might have been a system error. I am initiating a refund of ₹900 which is the difference between the two plans. The refund will reflect in 5-7 business days.
Customer: That is not acceptable. I want the full ₹1499 refunded because I did not authorize any of this.
Agent: I understand your concern. Let me escalate this to our billing department for a full review. You will receive a callback within 48 hours.`,
			Duration: 420,
			Language: "en",
		},

		// ──────────────────────────────────────────────────────────
		// 4. Happy customer feedback
		// Sentiment: Positive | Entities: Product, Plan
		// ──────────────────────────────────────────────────────────
		{
			CallerID: "JIO-6543210987",
			AgentID:  "AGT-150",
			Content: `Customer: Hi, I just wanted to call and say thank you. I recently switched to JioFiber and it has been absolutely amazing. The installation team came on time, the speed is excellent, and JioCinema premium is a wonderful bonus.
Agent: Thank you so much for the kind words! We are really happy to hear you are enjoying the service. Which JioFiber plan are you on?
Customer: I am on the ₹999 plan and the speed is great. I can stream in 4K without any buffering. My whole family loves it. The JioTV app is also fantastic for watching cricket matches.
Agent: That is wonderful to hear! If you ever need any assistance or want to explore our higher speed plans, do not hesitate to call us. We also have a referral program where you can earn credits for recommending JioFiber to friends.
Customer: That sounds great! I will definitely recommend it. Thank you for the excellent service.`,
			Duration: 195,
			Language: "en",
		},

		// ──────────────────────────────────────────────────────────
		// 5. JioFiber installation request
		// Sentiment: Neutral to Positive | Entities: Product, Location
		// ──────────────────────────────────────────────────────────
		{
			CallerID: "JIO-5432109876",
			AgentID:  "AGT-088",
			Content: `Customer: Hello, I want to get JioFiber installed at my new apartment in Bangalore. What is the process and how long does it take?
Agent: Welcome! I would be happy to help you with JioFiber installation. First, let me check if your area in Bangalore is serviceable. What is your pincode?
Customer: It is 560001, near MG Road area.
Agent: Great news! Your area is fully serviceable. The installation process takes about 2-3 days after booking. A technician will visit your apartment to set up the ONT device and router.
Customer: That sounds good. What plans do you have for Bangalore?
Agent: All our standard JioFiber plans are available. The most popular in Bangalore is the ₹999 plan with 100 Mbps speed. It comes with unlimited data, JioTV, and JioCinema.
Customer: Perfect, I would like to go with that plan. Can you schedule the installation for this weekend?
Agent: Absolutely! I have booked your installation for Saturday between 10 AM and 2 PM. You will receive an SMS with the technician details.`,
			Duration: 275,
			Language: "en",
		},

		// ──────────────────────────────────────────────────────────
		// 6. Roaming charges question
		// Sentiment: Neutral | Entities: Plan, Issue
		// ──────────────────────────────────────────────────────────
		{
			CallerID: "JIO-4321098765",
			AgentID:  "AGT-177",
			Content: `Customer: I am travelling to Dubai next week for business and I want to understand the roaming charges on my Jio plan. I do not want any surprise bills.
Agent: Of course! International roaming charges depend on your destination. For Dubai, we have special roaming packs. The basic pack is ₹575 per day which includes 100 MB data, 100 minutes of local and India calls.
Customer: That seems expensive for just 100 MB. Is there a better option with more data?
Agent: Yes, we have the Jio International Pack at ₹2875 for 7 days which gives you 500 MB per day and unlimited incoming calls. For heavy data users, there is the ₹5751 pack for 15 days with 1 GB per day.
Customer: I will be there for 5 days. The 7-day pack with 500 MB seems reasonable. Can I activate it now or should I do it when I arrive?
Agent: I recommend activating it before you leave. I can do it right now. It will become active once your phone connects to a network in Dubai.
Customer: Okay, please activate the ₹2875 pack. Thank you for explaining everything clearly.`,
			Duration: 340,
			Language: "en",
		},

		// ──────────────────────────────────────────────────────────
		// 7. SIM activation issue
		// Sentiment: Negative | Entities: Issue, Product
		// ──────────────────────────────────────────────────────────
		{
			CallerID: "JIO-3210987654",
			AgentID:  "AGT-233",
			Content: `Customer: I bought a new JioPhone last week and the SIM activation is still not working. I have been waiting for 7 days now. This is ridiculous. I submitted all the documents and did the biometric verification at the store.
Agent: I apologize for the delay. Usually SIM activation takes 24-48 hours. Let me check the status of your activation request.
Customer: 7 days is not 48 hours. I bought this phone for my mother who lives in Jaipur and she has been without a phone this whole time. This is very bad service.
Agent: I completely understand your frustration and I am very sorry. I can see your activation request is stuck in verification. There seems to be an issue with the Aadhaar verification step. Let me push this through manually.
Customer: How long will it take now?
Agent: I have escalated this to our activation team with high priority. The SIM should be activated within the next 4 hours. I will personally make sure of it and call you back to confirm.
Customer: Please do. My mother really needs her phone working.`,
			Duration: 385,
			Language: "en",
		},

		// ──────────────────────────────────────────────────────────
		// 8. Mixed sentiment — starts angry, ends satisfied
		// Sentiment: Mixed/Neutral | Entities: Issue, Plan, Product
		// ──────────────────────────────────────────────────────────
		{
			CallerID: "JIO-2109876543",
			AgentID:  "AGT-099",
			Content: `Customer: Your JioTV app keeps crashing on my phone. Every time I try to watch a cricket match it freezes and crashes. I am very angry because I specifically got the Jio ₹999 plan for the JioTV premium features.
Agent: I am sorry to hear about the JioTV issues. This is a known problem with a recent app update. Can you tell me which phone model you are using?
Customer: I have a Samsung Galaxy M31.
Agent: Thank you. We have already released a fix for this issue. If you go to the Play Store and update JioTV to the latest version 7.0.8, the crashing should stop.
Customer: Okay let me try that. Hold on... I am updating now... Okay the update is installed. Let me open the app... It seems to be working now! The cricket match is loading.
Agent: Wonderful! I am glad that resolved the issue. I also want to let you know we have added new channels to JioTV this month including three new sports channels.
Customer: Great, thank you for the quick fix. I appreciate the help. You have been very helpful today.`,
			Duration: 290,
			Language: "en",
		},

		// ──────────────────────────────────────────────────────────
		// 9. Data speed complaint from a business user
		// Sentiment: Negative | Entities: Plan, Issue, Location
		// ──────────────────────────────────────────────────────────
		{
			CallerID: "JIO-1098765432",
			AgentID:  "AGT-401",
			Content: `Customer: I run a small business in Hyderabad and I rely on my Jio connection for everything. For the past three days, the data speed has dropped to almost nothing. I cannot even load my email properly. This slow internet is killing my business.
Agent: I understand how critical connectivity is for your business. Let me run some diagnostics on your connection right away.
Customer: I have the Jio ₹1499 plan which is supposed to be your premium offering. I am not getting premium speeds at all. My employees cannot access our cloud services. This is a terrible experience.
Agent: I can see there is congestion in the Hyderabad cell tower near your area. We are adding capacity this week. In the meantime, I would like to offer you a complimentary upgrade to our business plan for one month with priority network access.
Customer: What does that include?
Agent: It includes dedicated bandwidth, priority during peak hours, and a static IP. This should resolve your speed issues immediately while we fix the underlying capacity problem.
Customer: Fine, let us try that. But I expect a permanent solution, not just a temporary fix.`,
			Duration: 365,
			Language: "en",
		},

		// ──────────────────────────────────────────────────────────
		// 10. International customer — simple inquiry
		// Sentiment: Positive | Entities: Plan, Product
		// ──────────────────────────────────────────────────────────
		{
			CallerID: "JIO-9988776655",
			AgentID:  "AGT-155",
			Content: `Customer: Hello, I recently moved back to India from the US and I must say Jio has been a wonderful surprise. The ₹599 plan gives me more data than I ever had in the US for a fraction of the price. I love it.
Agent: Welcome back to India! We are thrilled to have you as a Jio customer. Is there anything specific I can help you with today?
Customer: Yes, I wanted to know if I can get a family plan. My parents and my sister also want to switch to Jio. Is there any discount for multiple connections?
Agent: Absolutely! We have the Jio Family Plan where you can add up to 5 members. Each member gets their own plan but you get a 10 percent discount on each connection, and you can manage all bills from a single JioApp dashboard.
Customer: That is excellent! Can I set that up today?
Agent: Of course! I just need the phone numbers and Aadhaar details for each family member. We can complete the setup right now and your family can start enjoying Jio services within 24 hours.
Customer: Thank you so much, this is great service!`,
			Duration: 280,
			Language: "en",
		},
	}
}
