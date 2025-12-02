import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
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
          <div className="mb-4">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">
              Privacy Policy
            </h1>
            <p className="text-gray-300 text-lg font-semibold mb-1">GOLD (GoldPOS) by RetailMarketingPro</p>
            <p className="text-gray-300 text-sm">Last Updated: 12/1/2025</p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <p className="text-gray-200 leading-relaxed mb-6">
              Your privacy is important to us. This Privacy Policy explains how RetailMarketingPro ("we", "us", "our") collects, uses, stores, and protects information when you use our GOLD (GoldPOS) mobile app, web application, or related services ("Service").
            </p>
          </div>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              We collect only minimal business-related information required to activate your account and operate the Service.
            </p>
            <h3 className="text-xl font-semibold text-white mb-3 mt-4">A. Information You Provide</h3>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>Business name / business type</li>
              <li>Person-in-charge name</li>
              <li>Phone number or email address</li>
            </ul>
            <p className="text-gray-200 leading-relaxed mt-4">
              No other personal or business data is collected automatically.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">2. How We Store Data</h2>
            <h3 className="text-xl font-semibold text-white mb-3 mt-4">A. Mobile App</h3>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>All data entered in the GOLD (GoldPOS) mobile app is stored locally on your device</li>
              <li>We do NOT upload or access your data</li>
              <li>You are responsible for backup, export, or restoring data on your device</li>
            </ul>
            <h3 className="text-xl font-semibold text-white mb-3 mt-4">B. Web Application</h3>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Data is stored on our secure cloud servers</li>
              <li>You have full control to:
                <ul className="list-circle list-inside ml-6 mt-2 space-y-1">
                  <li>Add data</li>
                  <li>Update data</li>
                  <li>Delete data</li>
                  <li>Request full account deletion</li>
                </ul>
              </li>
            </ul>
            <p className="text-gray-200 leading-relaxed mt-4">
              You can request deletion at: <a href="mailto:retailmarketingpro1.0@gmail.com" className="text-yellow-400 hover:text-yellow-300 underline">retailmarketingpro1.0@gmail.com</a>
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              We use your provided information only for:
            </p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Account creation and verification</li>
              <li>Customer support</li>
              <li>Service-related communication</li>
              <li>Subscription or renewal contact</li>
            </ul>
            <p className="text-gray-200 leading-relaxed mb-2 font-semibold">We do NOT:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>Sell data</li>
              <li>Share data with third parties</li>
              <li>Use data for marketing without permission</li>
              <li>Collect any sensitive or financial information</li>
            </ul>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">4. No Access to Business Data</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              We do not access:
            </p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Your gold stock entries</li>
              <li>Billing information</li>
              <li>Transactions</li>
              <li>Customer data</li>
              <li>Inventory details</li>
            </ul>
            <p className="text-gray-200 leading-relaxed">
              All business operational data in the mobile app is stored only on your device unless you use the web platform.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">5. Cookies (Web Users Only)</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              The website gold.retailmarketingpro.in may use:
            </p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Essential cookies</li>
              <li>Basic analytics cookies (non-identifiable)</li>
            </ul>
            <p className="text-gray-200 leading-relaxed mb-2 font-semibold">We do NOT use:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>Third-party marketing cookies</li>
              <li>Retargeting pixels</li>
              <li>Behavioural tracking</li>
            </ul>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">6. Data Security</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              We take reasonable security measures to protect your information, including:
            </p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Encrypted servers</li>
              <li>Secured hosting</li>
              <li>Limited staff access</li>
              <li>Protected communication channels</li>
            </ul>
            <p className="text-gray-200 leading-relaxed mb-4">
              However, no system is 100% secure.
            </p>
            <p className="text-gray-200 leading-relaxed mb-2 font-semibold">You are responsible for securing:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>Your device</li>
              <li>Your login information</li>
              <li>Local data backups</li>
            </ul>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">7. Your Rights</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              You may request:
            </p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Data deletion</li>
              <li>Account removal</li>
              <li>Update or correction of your account details</li>
            </ul>
            <p className="text-gray-200 leading-relaxed">
              To request deletion or changes, email us at: <a href="mailto:retailmarketingpro1.0@gmail.com" className="text-yellow-400 hover:text-yellow-300 underline">retailmarketingpro1.0@gmail.com</a>
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">8. Third-Party Services</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              If any third-party services are used (hosting, payment gateways, analytics), they may have access only to the extent required to operate the Service.
            </p>
            <p className="text-gray-200 leading-relaxed mb-2 font-semibold">We do NOT authorize:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>Third-party data sale</li>
              <li>Marketing usage of your data</li>
              <li>Sharing of data without your permission</li>
            </ul>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">9. Subscription, Refund & Liability</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              Your privacy relates to your data; however, subscription, refund, and liability terms are described separately in our:
            </p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Terms & Conditions</li>
              <li>Refund Policy</li>
              <li>Disclaimer</li>
            </ul>
            <p className="text-gray-200 leading-relaxed">
              Maximum financial liability under any circumstance is INR 100.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">10. Children's Privacy</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              Our Service is made only for businesses and individuals above 18 years of age.
            </p>
            <p className="text-gray-200 leading-relaxed">
              We do not knowingly collect data from children.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">11. Changes to This Privacy Policy</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              We may update this Privacy Policy from time to time.
            </p>
            <p className="text-gray-200 leading-relaxed">
              Continued use of the Service means you accept the updated policy.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">12. Contact Us</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              For any privacy-related questions or requests, contact:
            </p>
            <div className="text-gray-200 space-y-2">
              <p className="font-semibold text-white">RetailMarketingPro</p>
              <p>Email: <a href="mailto:retailmarketingpro1.0@gmail.com" className="text-yellow-400 hover:text-yellow-300 underline">retailmarketingpro1.0@gmail.com</a></p>
              <p>Website: <a href="https://gold.retailmarketingpro.in" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 underline">gold.retailmarketingpro.in</a></p>
            </div>
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
          <div className="flex gap-4 flex-wrap">
            <Link to="/terms" className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
              Terms of Service
            </Link>
            <Link to="/refund" className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
              Refund Policy
            </Link>
            <Link to="/disclaimer" className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
              Disclaimer
            </Link>
            <Link to="/cookies" className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
              Cookie Notice
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

