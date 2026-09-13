# Medcore

Medcore is a responsive Arabic medical-learning platform deployed on Vercel with Firebase Authentication and Cloud Firestore.

## Architecture

- Vercel hosts the responsive site and protected serverless API.
- Firebase Authentication provides optional Google sign-in.
- Firestore permanently stores lessons, feedback, and signed-in learners' results.
- The API verifies Firebase ID tokens and permits administration only for `ADMIN_EMAIL`; quiz answers are never returned before submission.

## Configure

Create a Firebase project, enable Google sign-in and Cloud Firestore, then add the values in `.env.example` as Vercel environment variables. `FIREBASE_SERVICE_ACCOUNT_JSON` must only be set in Vercel and must never be committed.

## Run locally

Install dependencies, set the environment values in `.env`, then run `npm run dev`.

## Deployment

Import this repository into Vercel. Use the Hobby plan, add the Firebase values, and then connect `medcore2026.online` as the production domain. Add the DNS records Vercel displays at the domain registrar.
