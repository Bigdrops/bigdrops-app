# Telegram Evidence Vault — Setup Guide

## 1. Overview
- Purpose: Telegram as a multi-tenant evidence store for payment receipts, tax certificates, and other attachments.
- Architecture: Serverless proxy → Bot API → Private Group with Topics.

## 2. Prerequisites
- Telegram account with BotFather access.
- BIGDROPS project with Vercel deployment.

## 3. Bot Creation
- How to create a bot via BotFather.
- Naming conventions.
- Token storage (Vercel environment variable `TELEGRAM_BOT_TOKEN`).

## 4. Group & Topic Setup
- Group naming convention.
- Topic naming convention per tenant and evidence type.
- How to obtain `chat_id` and `message_thread_id`.
- Adding the bot as admin with required permissions.

## 5. Environment Configuration
- Required environment variables.
- Vercel deployment steps.

## 6. Testing the Integration
- Manual curl test to verify upload to a topic.
- Expected response format.

## 7. Metadata Caption Format
- Standard caption template for payment receipts.
- Installment tracking fields.
- Voided payment handling (caption editing).

## 8. Maintenance & Security
- Token rotation procedure.
- Rate limit awareness.
- File retention expectations.

## 9. Troubleshooting
- Common errors and solutions.