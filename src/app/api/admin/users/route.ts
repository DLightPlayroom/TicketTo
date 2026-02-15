import { NextRequest, NextResponse } from 'next/server';
import { getDataProvider } from '@/lib/data-provider';
import { CreateUserInput } from '@/lib/data-provider/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const provider = await getDataProvider();
    const users = await provider.getUsers();
    return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
    try {
        const body: CreateUserInput = await request.json();

        // Basic validation
        if (!body.email || !body.name) {
            return NextResponse.json({ error: 'Name and Email are required' }, { status: 400 });
        }

        // Enforce lowercase email
        body.email = body.email.toLowerCase();

        const provider = await getDataProvider();

        // Check if user exists
        const existing = await provider.getUserByEmail(body.email);
        if (existing) {
            return NextResponse.json({ error: 'User already exists' }, { status: 409 });
        }

        // Handle Google Account users
        const isGoogleAccount = body.isGoogleAccount || false;
        let generatedPassword = body.password;

        if (!generatedPassword) {
            // Check if it's a Google Account - if so, generate a random secure password that won't be used
            // If it's a normal account, generate a simple 8-char password
            generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        }

        const newUser = await provider.createUser({
            ...body,
            password: generatedPassword,
            phone: body.phone, // Ensure phone is passed
        });

        // Get email mode: SMTP (default) or EMAILJS (Frontend)
        const emailMode = (process.env.EMAIL_MODE || 'SMTP').toUpperCase();

        // Only send email if it is NOT a Google Account
        if (!isGoogleAccount) {
            if (emailMode === 'SMTP') {
                // SMTP Mode: Send Email via backend nodemailer
                try {
                    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
                        const nodemailer = await import('nodemailer');
                        const transportConfig = {
                            host: process.env.SMTP_HOST!,
                            port: Number(process.env.SMTP_PORT) || 587,
                            secure: false,
                            auth: {
                                user: process.env.SMTP_USER!,
                                pass: process.env.SMTP_PASS!,
                            },
                        };
                        const transporter = nodemailer.createTransport(transportConfig);

                        await transporter.sendMail({
                            from: process.env.SMTP_FROM || '"TicketTo Support" <support@ticketto.com>',
                            to: body.email,
                            subject: 'Welcome to TicketTo',
                            text: `Hello ${body.name},\n\nYour account has been created.\n\nLogin: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login\nEmail: ${body.email}\nPassword: ${generatedPassword}\n\nPlease change your password after logging in.\n\nBest regards,\nTicketTo Team`,
                            html: `<p>Hello ${body.name},</p><p>Your account has been created.</p><p><strong>Login:</strong> <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login">${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login</a><br><strong>Email:</strong> ${body.email}<br><strong>Password:</strong> ${generatedPassword}</p><p>Please change your password after logging in.</p><p>Best regards,<br>TicketTo Team</p>`,
                        });
                        console.log(`Email sent via SMTP to ${body.email}`);
                    } else {
                        console.log('SMTP not configured, skipping email.');
                    }
                } catch (emailError) {
                    console.error('Failed to send email:', emailError);
                    // Don't fail the request if email fails, just log it.
                }
            } else if (emailMode === 'EMAILJS') {
                console.log('EMAILJS Mode: Email will be sent by Frontend via EmailJS');
            }
        }


        return NextResponse.json({
            user: newUser,
            generatedPassword: isGoogleAccount ? undefined : (emailMode === 'EMAILJS' ? generatedPassword : undefined),
            emailMode: emailMode,
            isGoogleAccount: isGoogleAccount
        });
    } catch (error) {
        console.error('Create User Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
