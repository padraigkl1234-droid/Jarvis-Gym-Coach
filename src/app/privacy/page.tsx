import type { Metadata } from 'next';
import { LegalLayout, Section } from '@/components/LegalLayout';

export const metadata: Metadata = { title: 'Privacy Policy — VALORIS' };

const UPDATED = '14 July 2026';
const CONTACT_EMAIL = 'padraigkl1234@gmail.com';

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated={UPDATED}>
      <p>
        VALORIS (&ldquo;the app&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;) is a personal AI fitness and diet coach. This policy explains what
        data the app handles, where it lives, and what it&apos;s used for. The short version: your training, nutrition, and body data stay on
        your own device — we don&apos;t run a database and we don&apos;t sell or share your data.
      </p>

      <Section title="1. Data we collect">
        <p>You control everything you put into VALORIS. Depending on how you use the app, that can include:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Profile &amp; preferences</strong> — name, age, sex, height, weight, training goal, experience level, available equipment, dietary style, training-time preference, interests, and any notes you give your coach.</li>
          <li><strong>Training data</strong> — your weekly plan, logged sets (exercise, reps, weight, RPE), and cardio sessions (duration, distance).</li>
          <li><strong>Nutrition data</strong> — meals and macros you log, and water intake.</li>
          <li><strong>Body metrics</strong> — weight, body fat %, resting heart rate, and sleep hours you log over time.</li>
          <li><strong>Memory bank entries</strong> — durable facts you ask VALORIS to remember (injuries, preferences, records, etc.).</li>
          <li><strong>Food photos</strong> — if you photograph a meal to log it, that image is sent for one-time analysis and is not stored afterward.</li>
          <li><strong>Account data</strong> — if you choose to sign in with Google, we receive your name, email address, and profile picture from Google to identify you in the app.</li>
        </ul>
      </Section>

      <Section title="2. Where your data lives">
        <p>
          VALORIS stores your data locally on your device, in your browser&apos;s on-device storage. There is no VALORIS server database — nothing
          you log is retained on our servers between sessions.
        </p>
        <p>
          When you use an AI feature (chat with your coach, photo-based food logging, proactive insights, or a PDF export), the relevant data
          on your device is sent to our server for that single request, forwarded to Google&apos;s Gemini API to generate a response, and the
          result is returned to your device. That request is not stored afterward — it exists only for the moment it takes to answer you.
        </p>
      </Section>

      <Section title="3. Third-party services">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Google Gemini API</strong> — processes your training/nutrition context and photos to power coaching replies, insights, and food recognition. Subject to Google&apos;s own API data policies.</li>
          <li><strong>Google Sign-In</strong> — optional; used only to identify you in the app (name, email, avatar). We don&apos;t use it for advertising.</li>
          <li><strong>Vercel</strong> — hosts the app and its serverless functions.</li>
        </ul>
      </Section>

      <Section title="4. How we use your data">
        <p>
          Solely to run the app: to build your training plan, track your nutrition, generate coaching responses, and show your progress over
          time. We do not use your data for advertising, and we do not sell or rent it to anyone.
        </p>
      </Section>

      <Section title="5. Your choices &amp; control">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Export</strong> a full backup of your data as a JSON file at any time from Settings.</li>
          <li><strong>Delete</strong> everything instantly with the two-tap Reset in Settings → Danger Zone.</li>
          <li><strong>Sign out</strong> of Google at any time from Settings; this removes your session but does not delete your locally stored training data.</li>
          <li><strong>Uninstalling</strong> the app or clearing your browser&apos;s site data removes everything stored on that device.</li>
        </ul>
      </Section>

      <Section title="6. Data retention">
        <p>
          Your data is retained locally for as long as you keep the app installed and don&apos;t clear its storage. We retain nothing server-side.
          Google processes requests to the Gemini API under its own retention policy, which we don&apos;t control.
        </p>
      </Section>

      <Section title="7. Children's privacy">
        <p>VALORIS is not directed at children under 13, and we don&apos;t knowingly collect data from them.</p>
      </Section>

      <Section title="8. Security">
        <p>
          Data in transit to our AI features is sent over HTTPS. Because your data lives on your device, its security also depends on your
          device and browser being secured (passcode, up-to-date software).
        </p>
      </Section>

      <Section title="9. Changes to this policy">
        <p>If this policy changes, we&apos;ll update the date at the top of this page.</p>
      </Section>

      <Section title="10. Contact">
        <p>
          Questions about this policy or your data: <a className="text-clay underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Section>
    </LegalLayout>
  );
}
