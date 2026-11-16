import Link from "next/link";
export default function CommunityGuidelines(){
 return <main className="min-h-screen bg-[#F6F0E8] px-6 py-12 text-[#33241D]"><div className="mx-auto max-w-2xl space-y-6">
 <Link href="/discussions">← Discussions</Link><h1 className="font-serif text-4xl">A thoughtful place to talk.</h1>
 <p>Speak from your own experience. Disagree with ideas respectfully. Avoid harassment, hate, threats, spam, promotion, and other people’s private information. Keep the conversation connected to the reading.</p>
 <p>Text and emoji comments are welcome. Links and file uploads aren’t supported in discussions at this stage.</p>
 <h2 className="font-serif text-2xl">What people can see</h2>
 <p>Your display name, comments, replies, and reaction totals are public. Your email address and reports are private. Display names don’t verify someone’s identity. The Author badge is assigned by iSEREIN.</p>
 <p>Sign-in emails are used to access your account, not to subscribe you to marketing. Following a conversation adds updates inside My conversations. It does not enable email or push alerts, or change your daily reading reminder. You can separately choose reply emails for each discussion. These emails cover replies in that article’s conversation, not only replies addressed to you. We group replies, send at most one email per discussion per hour and four reply emails per reader in 24 hours, and never notify you about your own reply. Delivery may be delayed by these limits.</p>
 <p>Supabase stores your sign-in email and discussion preferences. Brevo processes your email address to deliver sign-in links and optional reply emails; your address is not added to a marketing list by this feature. You can stop a discussion’s emails using the link in each email or turn all reply emails off in Profile. Delivery records are kept for up to 30 days while the delivery schedule is running. A message already being sent may still arrive after you opt out.</p>
 <h2 className="font-serif text-2xl">Your choices</h2>
 <p>You can edit or delete your comments, remove reactions, unfollow conversations, or delete your account in Profile. Account deletion removes your contributions; other readers’ replies remain with a “Comment removed” reference.</p>
 <p>Saved readings and books remain on your device. Draft comments are also stored on this browser so you can finish signing in. Clearing browser data removes local saves and drafts.</p>
 <h2 className="font-serif text-2xl">Keeping this space welcoming</h2>
 <p>Report a comment when something needs attention. Moderators can hide comments, restrict posting, and close conversations. Reports are reviewed by a person, not published in the thread.</p>
 <p>For private feedback or a concern about your data, <Link href="/about" className="underline">contact iSEREIN</Link>.</p>
 </div></main>;
}
