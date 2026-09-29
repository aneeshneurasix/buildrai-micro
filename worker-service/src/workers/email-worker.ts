/**
 * Email Worker
 * Processes email sending tasks using AWS SES
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { Queue, Worker, Job } from 'bullmq';
import { logger, getRedisClient } from '@codstack/shared';

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@codstack.com';

interface EmailJob {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Email Queue
 */
export const emailQueue = new Queue('emails', {
  connection: getRedisClient() as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

/**
 * Email Worker
 */
export const emailWorker = new Worker(
  'emails',
  async (job: Job<EmailJob>) => {
    const { to, subject, html, text } = job.data;

    logger.info('Sending email', { to, subject });

    try {
      const command = new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: html,
              Charset: 'UTF-8',
            },
            Text: text
              ? {
                  Data: text,
                  Charset: 'UTF-8',
                }
              : undefined,
          },
        },
      });

      const response = await sesClient.send(command);

      logger.info('Email sent successfully', {
        to,
        messageId: response.MessageId,
      });

      return { success: true, messageId: response.MessageId };
    } catch (error: any) {
      logger.error('Failed to send email', {
        to,
        subject,
        error: error.message,
      });
      throw error;
    }
  },
  {
    connection: getRedisClient() as any,
    concurrency: 5,
  }
);

// Event handlers
emailWorker.on('completed', (job) => {
  logger.info(`Email job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  logger.error(`Email job ${job?.id} failed`, { error: err.message });
});

/**
 * Helper functions to send emails
 */

export async function sendWelcomeEmail(to: string, username: string) {
  return emailQueue.add('welcome', {
    to,
    subject: 'Welcome to Codstack!',
    html: `
      <h1>Welcome to Codstack, ${username}!</h1>
      <p>We're excited to have you on board.</p>
      <p>Start building amazing projects with AI-powered code generation.</p>
      <p>Best regards,<br>The Codstack Team</p>
    `,
    text: `Welcome to Codstack, ${username}! We're excited to have you on board. Start building amazing projects with AI-powered code generation.`,
  });
}

export async function sendTaskCompletedEmail(
  to: string,
  username: string,
  taskTitle: string,
  projectName: string
) {
  return emailQueue.add('task-completed', {
    to,
    subject: `Task Completed: ${taskTitle}`,
    html: `
      <h1>Task Completed!</h1>
      <p>Hi ${username},</p>
      <p>Your task "<strong>${taskTitle}</strong>" in project "${projectName}" has been completed successfully.</p>
      <p>Check your project to see the results.</p>
      <p>Best regards,<br>The Codstack Team</p>
    `,
    text: `Hi ${username}, your task "${taskTitle}" in project "${projectName}" has been completed successfully. Check your project to see the results.`,
  });
}

export async function sendTaskFailedEmail(
  to: string,
  username: string,
  taskTitle: string,
  projectName: string,
  error: string
) {
  return emailQueue.add('task-failed', {
    to,
    subject: `Task Failed: ${taskTitle}`,
    html: `
      <h1>Task Failed</h1>
      <p>Hi ${username},</p>
      <p>Your task "<strong>${taskTitle}</strong>" in project "${projectName}" encountered an error:</p>
      <p><code>${error}</code></p>
      <p>Please review and try again.</p>
      <p>Best regards,<br>The Codstack Team</p>
    `,
    text: `Hi ${username}, your task "${taskTitle}" in project "${projectName}" encountered an error: ${error}. Please review and try again.`,
  });
}

export async function sendLowTokensEmail(
  to: string,
  username: string,
  remaining: number,
  limit: number,
  percentage: number
) {
  return emailQueue.add('low-tokens', {
    to,
    subject: 'AI Usage Alert: Running Low on Tokens',
    html: `
      <h1>AI Usage Alert</h1>
      <p>Hi ${username},</p>
      <p>You've used <strong>${percentage}%</strong> of your monthly AI request limit.</p>
      <p>You have <strong>${remaining}</strong> of ${limit} requests remaining this month.</p>
      <p>Consider upgrading your plan to continue using AI features.</p>
      <p>Best regards,<br>The Codstack Team</p>
    `,
    text: `Hi ${username}, you've used ${percentage}% of your monthly AI request limit. You have ${remaining} of ${limit} requests remaining this month.`,
  });
}

export async function sendTokensExhaustedEmail(
  to: string,
  username: string,
  plan: string
) {
  return emailQueue.add('tokens-exhausted', {
    to,
    subject: 'AI Usage Limit Reached',
    html: `
      <h1>AI Usage Limit Reached</h1>
      <p>Hi ${username},</p>
      <p>You've reached your monthly AI request limit for the ${plan} plan.</p>
      <p>To continue using AI features, please upgrade your plan or wait until next month.</p>
      <p>Best regards,<br>The Codstack Team</p>
    `,
    text: `Hi ${username}, you've reached your monthly AI request limit for the ${plan} plan. To continue using AI features, please upgrade your plan or wait until next month.`,
  });
}
