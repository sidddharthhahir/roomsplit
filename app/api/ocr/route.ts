import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('receipt') as File;

    if (!file) {
      return NextResponse.json({ error: 'No receipt image provided' }, { status: 400 });
    }

    // Convert to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // Get all members for context
    const members = await prisma.groupMember.findMany({
      where: { groupId: user.groupId },
      select: { id: true, displayName: true }
    });

    const memberNames = members.map((m: { displayName: string }) => m.displayName).join(', ');

    // Call LLM API to extract receipt info
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `You are a receipt scanner AI. Extract information from receipt images and return structured data.

Available expense categories: rent, utilities, groceries, internet, entertainment, transport, dining, other

Respond with raw JSON only in this exact format:
{
  "success": true,
  "amount": 12.50,
  "description": "Store or item name",
  "category": "groceries",
  "date": "2024-02-08",
  "confidence": "high",
  "fullText": "Complete text content extracted from the receipt including store name, items, prices, date, address, etc."
}

If you cannot read the receipt clearly, return:
{
  "success": false,
  "error": "Reason why extraction failed"
}

Rules:
- Amount should be a number (not string), in EUR
- Description should be the store/vendor name or main item
- Category must be one of: rent, utilities, groceries, internet, entertainment, transport, dining, other
- Date in YYYY-MM-DD format (use today's date if not visible)
- Confidence: "high", "medium", or "low"
- fullText should contain ALL readable text from the receipt for search purposes`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please scan this receipt and extract the total amount, store/vendor name, category, date, and ALL text content from the receipt. The expense will be split among these roommates: ' + memberNames
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64}`
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM API error:', errorText);
      return NextResponse.json({ error: 'Failed to process receipt' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 });
    }

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Could not extract receipt information' 
      }, { status: 400 });
    }

    // Return extracted data
    return NextResponse.json({
      success: true,
      data: {
        amount: result.amount,
        description: result.description,
        category: result.category,
        date: result.date,
        confidence: result.confidence,
        fullText: result.fullText || ''
      },
      members: members.map((m: { id: string; displayName: string }) => ({ id: m.id, displayName: m.displayName }))
    });

  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json({ error: 'Failed to process receipt' }, { status: 500 });
  }
}
