exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { answers, prompt } = payload;

  if (!prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing prompt' }) };
  }

  const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY;
  const SUPABASE_URL   = process.env.SUPABASE_URL;
  const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_KEY;

  if (!ANTHROPIC_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Anthropic API key not configured' }) };
  }

  let reportText = '';
  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 800,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    const anthropicData = await anthropicRes.json();
    if (anthropicData.error) throw new Error(anthropicData.error.message || 'Anthropic error');
    reportText = (anthropicData.content || []).map(block => block.text || '').join('');

  } catch (err) {
    console.error('Anthropic call failed:', err.message);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Failed to generate report. Please try again.' }),
    };
  }

  if (SUPABASE_URL && SUPABASE_KEY && answers) {
    try {
      const record = {
        company_name:      answers.companyName      || null,
        industry:          answers.industry         || null,
        team_size:         answers.teamSize         || null,
        tech_stack:        Array.isArray(answers.techStack)
                             ? answers.techStack.join(', ')
                             : (answers.techStack || null),
        tech_stack_other:  answers.techStack_other  || null,
        revenue_workflows: answers.revenue          || null,
        content_home:      Array.isArray(answers.contentHome)
                             ? answers.contentHome.join(', ')
                             : (answers.contentHome || null),
        content_types:     Array.isArray(answers.contentTypes)
                             ? answers.contentTypes.join(', ')
                             : (answers.contentTypes || null),
        content_owner:     answers.contentOwner     || null,
        ai_tools:          Array.isArray(answers.aiTools)
                             ? answers.aiTools.join(', ')
                             : (answers.aiTools || null),
        ai_use:            Array.isArray(answers.aiUse)
                             ? answers.aiUse.join(', ')
                             : (answers.aiUse || null),
        ai_readiness:      answers.aiReadiness      || null,
        biggest_pain:      answers.biggestPain      || null,
        time_waste:        Array.isArray(answers.timeWaste)
                             ? answers.timeWaste.join(', ')
                             : (answers.timeWaste || null),
        win_90:            answers.win90            || null,
        contact_email:     answers.contactEmail     || null,
        report_generated:  reportText,
        source:            'ai-readiness-audit',
        submitted_at:      new Date().toISOString(),
      };

      const supabaseRes = await fetch(`${SUPABASE_URL}/rest/v1/audit_submissions`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify(record),
      });

      if (!supabaseRes.ok) {
        const errText = await supabaseRes.text();
        console.error('Supabase write failed:', supabaseRes.status, errText);
      } else {
        console.log('Lead saved to Supabase:', answers.companyName || 'unknown');
      }

    } catch (err) {
      console.error('Supabase error (non-fatal):', err.message);
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ report: reportText }),
  };
};
