import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link to="/">
            <Button
              variant="ghost"
              className="text-gray-300 hover:text-yellow-400 mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-gray-300 text-sm">Last updated: 2024</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <p className="text-gray-200 leading-relaxed mb-6">
              We at Retail Marketing Pro (the "Business" "we" or "us" in this Privacy Policy), operator of the web site at www.retailmarketingpro.in (the "Site"), understand the importance of the privacy of users of the Site, and in particular of protecting their personal information. We have therefore put in place this Privacy Policy, in order to inform you fully of our privacy practices, and to permit you to contact us with any concerns, questions, or corrections regarding your personal information in our possession.
            </p>
          </div>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">1. Accountability</h2>
            <p className="text-gray-200 leading-relaxed">
              The Business has provided this privacy policy for ensuring compliance. Should you have any questions regarding this policy or concerns with respect to Business`s compliance, you may contact us.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">2. Identifying Purpose of Collection</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              We collect various personal information from you when you seek our products or services, make an online reservation, sing-up to our VIP newsletter membership or any inquiry through the Site. Information collected may include your:
            </p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 mb-4 ml-4">
              <li>Full Name</li>
              <li>Company Name</li>
              <li>Address(es)</li>
              <li>Telephone and Facsimile number(s)</li>
              <li>Email address(es)</li>
              <li>Gender</li>
              <li>Interest(s)</li>
            </ul>
            <p className="text-gray-200 leading-relaxed mb-4">
              We collect this information in order to permit us to:
            </p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 mb-4 ml-4">
              <li>Verify your identity,</li>
              <li>Permit us to contact you to provide goods and services requested by you,</li>
              <li>Provide you with periodic updates regarding the Site and our products and services.</li>
            </ul>
            <p className="text-gray-200 leading-relaxed mb-4">
              We may also use such information to build a profile of your interests as they relate to the Site or Business so that we will be able to suggest or provide products or services of interest to you in the future.
            </p>
            <p className="text-gray-200 leading-relaxed mb-4">
              We do not collect information which we do not reasonably require in order to fulfill these purposes.
            </p>
            <p className="text-gray-200 leading-relaxed mb-4">
              Further, the Site automatically collects certain information every time you visit it:
            </p>
            
            <div className="ml-4 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">a) Cookies</h3>
                <p className="text-gray-200 leading-relaxed mb-2">
                  A cookie is a small non-executable file that is stored on your hard drive for the purpose of identifying your computer. While it is possible to view and to acquire products and services from the site with your browser`s security settings set to prevent cookies from being used, your online experience may be greatly reduced.
                </p>
                <p className="text-gray-200 leading-relaxed mb-2">
                  Business uses both session cookies and permanent cookies at Site only after you have created a user account on the platform. Session cookies are active only during the period you are logged on to the Site and are removed when you leave.
                </p>
                <p className="text-gray-200 leading-relaxed">
                  Permanent cookies remain on your hard drive until you remove them through your browser`s Internet security settings. Permanent cookies are used to store login information and user preferences and thus eliminate you're having to make the same entries on each visit.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">b) Conversion Beacons</h3>
                <p className="text-gray-200 leading-relaxed">
                  The Business also uses Conversion Beacons (short bits of HTML computer code) inserted in the source code of designated website pages. These beacons, used with industry standard browser cookie technology and standard Html coding, allow us to track analytics to the Site and email flow between you and us. Email recipients who receive a Conversion Beacon enabled email message will receive a small unique cookie that is stored in their browser session, which is later used to connect the email recipient with the subsequent recipient activity on the Site.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-2">Consent and CEMs</h3>
              <p className="text-gray-200 leading-relaxed mb-2">
                When you acquire any product or service on or through the Site, or you provide any information at our request, your action constitutes consent to our collection and use of such information as permitted in this Privacy Policy.
              </p>
              <p className="text-gray-200 leading-relaxed mb-2">
                Express consent is obtained when you explicitly toggle the opt-in check-box to agree to express permission for us to send you commercial electronic messages ("CEM").
              </p>
              <p className="text-gray-200 leading-relaxed mb-2">
                Implied consent is obtained when you have purchased our goods or services and have provided your email address from a reservation, comment form, coupon or other methods.
              </p>
              <p className="text-gray-200 leading-relaxed mb-2">
                Email communications are sent from a software provided by Retail Marketing Pro. All email communications include the Business name, contact and a mechanism that allows the recipient to unsubscribe at no cost.
              </p>
              <p className="text-gray-200 leading-relaxed">
                Please note that if you do not wish to receive emails from us, you may opt-out automatically of such material by clicking on the unsubscribe link found in the email communication sent to you by our Business.
              </p>
            </div>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">3. Limiting Collection</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              The Business will limit the collection of personal information to that which reasonably necessary to fulfill the purpose for which it was collected.
            </p>
            <p className="text-gray-200 leading-relaxed mb-4">
              Research and survey data is reported back to Business as aggregated data with no reference to individual customers.
            </p>
            <p className="text-gray-200 leading-relaxed">
              Customers who do not wish to be contacted for research or survey purposes should contact us.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">4. Limiting Use, Disclosure, and Retention</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              We will not use or disclose your personal information for purposes other than those for which it was collected without your consent or as permitted or required by law.
            </p>
            <p className="text-gray-200 leading-relaxed mb-4">
              However, we do use the services of third parties to complete certain electronic requests such as reservations, newsletter sign-ups along with any other 3rd party widgets, and your personal information may, therefore, be transmitted to such third parties for such purposes. If your personal data is to be transmitted to another party for processing or storage, we use contractual and other means to ensure that your personal information is protected in accordance with PIPEDA.
            </p>
            <p className="text-gray-200 leading-relaxed mb-4">
              Your user data will be stored by Retail Marketing Pro, a product developed by Retail Marketing Pro.
            </p>
            <p className="text-gray-200 leading-relaxed">
              Your personal information is retained only for as long as necessary to fulfill the purposes for which it was collected unless the law requires longer retention.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">5. Accuracy</h2>
            <p className="text-gray-200 leading-relaxed">
              In order to maintain the highest levels of accuracy regarding your personal information, to the extent possible we permit you to enter such information into our systems yourself. In some instances, however, we are required to enter such information, for instance upon speaking to you over the phone or some other type of communication (provided by you or otherwise).
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">6. Safeguards</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              While in our possession (or the possession of any entity engaged by us to house or store it) and regardless of the format in which it is held, your personal information is protected against theft, loss and/or unauthorized access, disclosure, copying, use or modification by security safeguards appropriate to the sensitivity of the information.
            </p>
            <p className="text-gray-200 leading-relaxed">
              Some personal information entered by you into our systems may be encrypted as it travels over the Internet. Depending on your web browser you may see a secure webpage indicator, for example, a closed lock in the lower right-hand corner of your browser. We may use the Secure Socket Layer (SSL) protocol to encrypt some personal information as it travels from your computer to our systems.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">7. Openness</h2>
            <p className="text-gray-200 leading-relaxed">
              Business`s privacy practices are as outlined within this policy. If you have any questions or comments, please contact us.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">8. Individual Access</h2>
            <p className="text-gray-200 leading-relaxed">
              With certain limited exceptions, you have a right to access your personal information held by the Business. You may access your personal information by contacting us.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">Changes to the Privacy Policy</h2>
            <p className="text-gray-200 leading-relaxed">
              Business reserves the right to modify this privacy statement at any time, so please review it frequently. If we make material changes to this policy we will notify you on our homepage and other places we deem appropriate so that you are aware of what information we collect how we use it, and under what circumstances, if any, we disclose it.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">Refund and Cancellation Policy</h2>
            <p className="text-gray-200 leading-relaxed">
              i. All refund amounts shall be credited to your account within 5-7 business days in accordance with the terms that may be stipulated by the bank which has issued the credit/debit card.
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <Link to="/">
            <Button
              variant="outline"
              className="border-slate-600 text-gray-300 hover:text-yellow-400 hover:border-yellow-500/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex gap-4">
            <Link to="/policy" className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;

