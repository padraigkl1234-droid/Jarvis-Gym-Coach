import type { Metadata } from 'next';
import { LegalLayout, Section } from '@/components/LegalLayout';

export const metadata: Metadata = { title: 'Terms of Service — VALORIS' };

const UPDATED = '14 July 2026';
const CONTACT_EMAIL = 'padraigkl1234@gmail.com';

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated={UPDATED}>
      <p>By using VALORIS (&ldquo;the app&rdquo;), you agree to these terms. If you don&apos;t agree, please don&apos;t use the app.</p>

      <Section title="1. Not medical advice">
        <p>
          VALORIS is a personal training and nutrition coaching tool. It is not a medical device and does not provide medical advice,
          diagnosis, or treatment. Its training plans, calorie/macro targets, and coaching guidance are generated estimates, not
          professional medical or dietary prescriptions.
        </p>
        <p>
          Talk to a doctor before starting a new exercise or diet program, especially if you have an existing health condition, injury,
          or are pregnant. Stop immediately and seek medical attention if you experience pain, dizziness, or other concerning symptoms
          during training.
        </p>
      </Section>

      <Section title="2. Your account">
        <p>
          Signing in with Google is optional and only used to identify you within the app. You&apos;re responsible for keeping your device
          and Google account secure. Since your training data lives on your device, losing access to the device without a backup means
          losing that data — use the Export Backup feature in Settings regularly if you want a copy elsewhere.
        </p>
      </Section>

      <Section title="3. Your content">
        <p>
          You own the data you put into VALORIS — your profile, logs, and photos. By using AI features (chat, photo food logging,
          insights, PDF export), you&apos;re asking the app to send the relevant data to Google&apos;s Gemini API to generate a response, as
          described in the Privacy Policy.
        </p>
      </Section>

      <Section title="4. Acceptable use">
        <p>
          Use VALORIS for its intended purpose — your own personal training and nutrition tracking. Don&apos;t attempt to disrupt, reverse
          engineer for malicious purposes, or abuse the service in a way that degrades it for others.
        </p>
      </Section>

      <Section title="5. Subscription tiers">
        <p>
          VALORIS offers a free tier and an optional premium tier that unlocks additional AI-driven features (such as proactive coaching
          insights and photo-based food logging). Premium features are gated in the app and may change over time.
        </p>
      </Section>

      <Section title="6. No warranty">
        <p>
          VALORIS is provided &ldquo;as is&rdquo;, without warranties of any kind. AI-generated content (coaching advice, calorie estimates,
          training plans) can be inaccurate — use your own judgment, and verify anything safety-critical.
        </p>
      </Section>

      <Section title="7. Limitation of liability">
        <p>
          To the fullest extent permitted by law, we are not liable for any injury, loss, or damage arising from your use of VALORIS,
          including reliance on its training, nutrition, or coaching output.
        </p>
      </Section>

      <Section title="8. Changes">
        <p>We may update the app and these terms over time. Continued use after a change means you accept the updated terms.</p>
      </Section>

      <Section title="9. Contact">
        <p>
          Questions about these terms: <a className="text-clay underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Section>
    </LegalLayout>
  );
}
