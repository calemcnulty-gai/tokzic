# Tokzic Product Requirements Document (PRD)

## 1. Overview
**Product Name:** Tokzic  
**Version:** 1.0  
**Date:** [Insert Date]  
**Author:** [Insert Author Name]

Tokzic is a mobile video app that delivers an endless stream of dopamine-maximizing, short-form videos. This document outlines the requirements and features designed specifically for our target audience—consoomers, with a particular focus on the Internet Addict.

## 2. Target Audience & Vertical
**Primary Users:**  
- **Consoomers:** Users who thrive on continuous, engaging content consumption.  
- **Internet Addicts:** A subset of consoomers who seek rapid, on-demand satisfaction with each interaction.

**User Characteristics:**  
- A preference for short, impactful videos that demand minimal attention yet provide maximum engagement.
- A desire for highly personalized content and meaningful (or impactful) social interactions.
- An affinity for expressing extreme reactions both positive (Super Likes, tips) and negative (Super Dislikes, Toxic Tips).

## 3. Product Objectives
- **Infinite Engagement:** Present a seamless, endless feed of short-form videos designed for rapid content consumption.
- **Personalization:** Utilize swipe interactions (left/right) to tailor content recommendations in real time.
- **Social Interaction:** Foster parasocial relationships between users and creators via commenting and @mention features.
- **Expressive Feedback:** Enable strong feedback options such as Super Likes, Super Dislikes, and monetary gestures (tips/Toxic Tips) to convey user sentiment.

## 4. Features & Requirements

### 4.1 Endless Video Feed
**Description:**  
- Provide a continuously scrolling feed that serves up short, highly engaging videos.
- Optimize transitions and load times to keep the momentum for rapid consumption.

**Acceptance Criteria:**  
- The feed loads additional videos seamlessly as users scroll.
- Videos are curated for brevity and impact, maximizing user engagement.

### 4.2 Personalized Feed Based on Swipe Interactions
**Description:**  
- Allow users to influence future content recommendations with left- (disinterest) and right-swipe (interest) actions.
- Adapt the feed dynamically in near real-time to reflect user preferences.

**Acceptance Criteria:**  
- Swipe interactions are reliably recorded.
- The recommendation algorithm adjusts the feed promptly based on swipe data.

### 4.3 Social Engagement: Comments & @Mentions
**Description:**  
- Enable users to comment on videos to share their thoughts.
- Support @mention functionality so users can reach out directly to content creators, adding a layer of parasocial interaction.

**Acceptance Criteria:**  
- Users can create, edit, and delete comments.
- @mentions trigger notifications for creators.

### 4.4 Super Likes & Tipping
**Description:**  
- Integrate a Super Like feature so users can show strong positive feedback.
- Allow tipping to enable users to financially support favored creators.

**Acceptance Criteria:**  
- Super Likes are recorded and visibly associated with the creator.
- Tipping functionality is integrated with secure payment processing and correctly updates creator earnings.

### 4.5 Super Dislikes
**Description:**  
- Let users leave Super Dislikes on creators whose content does not resonate, temporarily downranking their videos.
- Ensure that negative feedback does not permanently penalize creators but provides a short-term adjustment.

**Acceptance Criteria:**  
- A Super Dislike can be applied to content or creators.
- The downranking effect is temporary and reverses after a defined period.

### 4.6 Toxic Tips
**Description:**  
- Offer a Toxic Tip feature where users can send a monetary penalty to a creator by spending money, which in turn deducts an equivalent amount from the creator's income.
- This feature is designed to allow extreme negative feedback with tangible consequences.

**Acceptance Criteria:**  
- Toxic Tip transactions securely handle the transfer of funds.
- The creator's earnings are updated reliably to reflect the deduction.
- Detailed records are maintained for auditing and transparency.

## 5. Non-Functional Requirements
- **Performance:**  
  - Minimal latency in video loading and feed transitions.
  - High responsiveness to swipe interactions and social actions.
  
- **Scalability:**  
  - The system must handle large numbers of concurrent users and sustain continuous video streaming.
  
- **Security:**  
  - Secure handling of payment processes (tipping and Toxic Tips).
  - Protection of user data and interactions throughout the application.
  
- **Maintainability:**  
  - A modular code structure using pure, composable functions where possible.
  - Clear separation of concerns to ensure ease of future modifications and AI integrations.

## 6. Technical Considerations
- **Frontend:**  
  - Built using React Native with Expo for rapid cross-platform development.
  - Redux (with Redux Toolkit) for state management to ensure predictable data flows.
  
- **Backend:**  
  - Leveraging the Firebase Suite for authentication, storage, and database operations.
  - Firebase Functions to manage server-side tasks like updating view counts, processing swipe data, and handling social interactions.
  
- **Future AI Integration:**  
  - The architectural design reserves dedicated modules (e.g., services/ai.ts) for future AI-driven personalization, potentially using Pinecone Vector DB.
  
- **Code Modularity:**  
  - Emphasis on pure functions and isolated side effects to maintain a clean and maintainable codebase.

## 7. Timeline & Milestones

### Rapid MVP Build (48 Hours Target)
- **Day 1:**  
  - Set up project infrastructure (React Native project with Expo).
  - Implement the endless video feed and basic swipe interactions.
  - Establish core screens (e.g., Home, Video Detail, Profile).

- **Day 2:**  
  - Integrate social features (comments, @mentions).
  - Implement Super Like and basic tipping functionality.
  - Begin groundwork for capturing swipe data for personalization.

### Future Enhancements
- Refine and optimize the recommendation engine using swipe data.
- Develop and integrate Super Dislikes and Toxic Tips with secure payment processing.
- Expand AI capabilities for more advanced content personalization.

## 8. Success Metrics
- **Engagement Metrics:**  
  - Average session duration and number of videos watched per session.
  - Swipe interaction statistics (swipe-right vs. swipe-left ratios).

- **Monetization Metrics:**  
  - Total volume and frequency of tipping and Toxic Tip transactions.
  
- **User Satisfaction:**  
  - Feedback on social engagement features (comments, @mentions, Super Likes).
  - Ratings and surveys post-interaction.

- **System Performance:**  
  - Feed load times and responsiveness during high user activity.

## 9. Risks & Mitigations
- **Regulatory/Financial:**  
  - Ensure compliance with payment processing regulations and transparency in monetary transactions.
- **User Experience:**  
  - Avoid potential abuse of negative feedback features (Super Dislikes, Toxic Tips) through rate limiting or moderation.
- **Technical:**  
  - Maintain rigorous separation of concerns to support rapid future integrations (e.g., AI personalization) without destabilizing core features.

## 10. Conclusion
Tokzic is uniquely positioned to serve the needs of consoomers—specifically catering to the fast-paced demands of Internet Addicts. By combining an endless, personalized video feed with strong social and financial feedback mechanisms, Tokzic is designed to maximize user engagement while offering scalable, future-proof architecture. This PRD serves as the blueprint to guide both the MVP launch and the evolution of advanced features in upcoming releases. 