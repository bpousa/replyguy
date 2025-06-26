import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

function getFailedPaymentEmail(userName: string, productName: string, retryDate: string): EmailTemplate {
  const subject = 'Payment Failed - Action Required';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Failed</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          
          <p>We were unable to process your payment for your ${productName} subscription to ReplyGuy.</p>
          
          <div class="warning">
            <strong>Action Required:</strong> Please update your payment method to continue enjoying uninterrupted access to ReplyGuy.
          </div>
          
          <p>We'll attempt to charge your payment method again on <strong>${retryDate}</strong>. If the payment fails again, your subscription may be downgraded to the free plan.</p>
          
          <center>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" class="button">Update Payment Method</a>
          </center>
          
          <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
          
          <p>Best regards,<br>The ReplyGuy Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const textContent = `
Hi ${userName},

We were unable to process your payment for your ${productName} subscription to ReplyGuy.

ACTION REQUIRED: Please update your payment method to continue enjoying uninterrupted access to ReplyGuy.

We'll attempt to charge your payment method again on ${retryDate}. If the payment fails again, your subscription may be downgraded to the free plan.

Update your payment method here: ${process.env.NEXT_PUBLIC_APP_URL}/billing

If you have any questions or need assistance, please don't hesitate to reach out to our support team.

Best regards,
The ReplyGuy Team
  `;
  
  return { subject, htmlContent, textContent };
}

function getTrialEndingEmail(userName: string, productName: string, trialEndDate: string): EmailTemplate {
  const subject = 'Your ReplyGuy Trial is Ending Soon';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .features { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Trial is Ending Soon</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          
          <p>Your free trial of ReplyGuy ${productName} will end on <strong>${trialEndDate}</strong>.</p>
          
          <p>Don't lose access to these premium features:</p>
          
          <div class="features">
            <ul>
              <li>✨ Unlimited AI-powered replies</li>
              <li>🎯 Advanced reply type matching</li>
              <li>🔍 Real-time research integration</li>
              <li>🎨 Custom meme generation</li>
              <li>📊 Detailed analytics</li>
            </ul>
          </div>
          
          <p>Continue creating amazing replies without interruption:</p>
          
          <center>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" class="button">Continue Subscription</a>
          </center>
          
          <p>If you have any questions about your subscription, feel free to reach out!</p>
          
          <p>Best regards,<br>The ReplyGuy Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const textContent = `
Hi ${userName},

Your free trial of ReplyGuy ${productName} will end on ${trialEndDate}.

Don't lose access to these premium features:
- Unlimited AI-powered replies
- Advanced reply type matching
- Real-time research integration
- Custom meme generation
- Detailed analytics

Continue creating amazing replies without interruption:
${process.env.NEXT_PUBLIC_APP_URL}/billing

If you have any questions about your subscription, feel free to reach out!

Best regards,
The ReplyGuy Team
  `;
  
  return { subject, htmlContent, textContent };
}

export async function POST(req: NextRequest) {
  try {
    const { userId, type, metadata } = await req.json();
    
    // Get user details
    const { data: user } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single();
      
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    let emailTemplate: EmailTemplate;
    
    switch (type) {
      case 'payment_failed':
        emailTemplate = getFailedPaymentEmail(
          user.full_name || user.email.split('@')[0],
          metadata.productName || 'Premium',
          metadata.retryDate || 'in 3 days'
        );
        break;
        
      case 'trial_ending':
        emailTemplate = getTrialEndingEmail(
          user.full_name || user.email.split('@')[0],
          metadata.productName || 'Premium',
          metadata.trialEndDate || 'soon'
        );
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }
    
    // TODO: Integrate with your email service (SendGrid, Resend, etc.)
    // For now, we'll log the email content
    console.log('📧 Email notification:', {
      to: user.email,
      subject: emailTemplate.subject,
      type,
      metadata
    });
    
    // Store notification record
    await supabase
      .from('email_notifications')
      .insert({
        user_id: userId,
        email: user.email,
        type,
        subject: emailTemplate.subject,
        metadata,
        sent_at: new Date().toISOString()
      });
    
    return NextResponse.json({ 
      success: true,
      message: 'Notification sent',
      email: user.email 
    });
    
  } catch (error) {
    console.error('Failed to send notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}