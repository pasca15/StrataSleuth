<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1FfqsURAst8mrB5JWXx3FDUL4saYMWNXy

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Architecture Diagram
```mermaid
graph TD
    User[User / Home Buyer] -->|Uploads PDF| FE[Frontend UI]
    FE -->|Raw Files| BE[Backend API]
    
    subgraph "Gemini 3 Integration"
        BE -->|Step 1: OCR & Derendering| G_Vision["Gemini 3 Pro (Vision)"]
        G_Vision -->|Structured Text/Tables| Data[Cleaned Data Context]
        
        Data -->|Step 2: Deep Think Analysis| G_Reason["Gemini 3 Pro (Reasoning)"]
        G_Reason -->|Extract Financials| Fin[Financial Model]
        G_Reason -->|Analyze Sentiment| Risk[Risk Index]
        
        Fin & Risk -->|Step 3: Forecasting| G_Agent[Gemini 3 Agent]
        G_Agent -->|Simulate 10 Years| Forecast[Final Report]
    end
    
    Forecast -->|JSON Response| FE
    FE -->|Render Charts| User
```
