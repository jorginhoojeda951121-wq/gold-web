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
          <div className="mb-4">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">
              Terms & Conditions
            </h1>
            <p className="text-gray-300 text-lg font-semibold mb-1">GOLD (GoldPOS) by RetailMarketingPro</p>
            <p className="text-gray-300 text-sm">Last Updated: 12/1/2025</p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <p className="text-gray-200 leading-relaxed mb-6">
              These Terms & Conditions ("Terms") govern your use of the GOLD (GoldPOS) web application, mobile application, and related services ("Service") provided by RetailMarketingPro ("we", "us", "our"). By accessing or using the Service, you agree to these Terms.
            </p>
          </div>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              By using GOLD (GoldPOS), you confirm that you have read, understood, and agree to follow all Terms, Privacy Policy, Refund Policy, and Disclaimer provided by RetailMarketingPro.
            </p>
            <p className="text-gray-200 leading-relaxed">
              If you do not agree, you must stop using the Service.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">2. Eligibility</h2>
            <p className="text-gray-200 leading-relaxed mb-4">You must be:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>A business owner or authorized representative</li>
              <li>Legally capable of entering agreements</li>
              <li>Responsible for all actions taken under your account</li>
            </ul>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">3. Services We Provide</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              GOLD (GoldPOS) is a software tool designed for:
            </p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Gold and jewellery stock management</li>
              <li>Billing and invoicing</li>
              <li>Customer management</li>
              <li>Business reporting</li>
              <li>POS functionality</li>
            </ul>
            <p className="text-gray-200 leading-relaxed mb-2 font-semibold">We do NOT buy, store, trade, evaluate, insure, or guarantee gold/precious metals.</p>
            <p className="text-gray-200 leading-relaxed">
              We ONLY provide software tools to manage your own business operations.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">4. Data Handling</h2>
            <h3 className="text-xl font-semibold text-white mb-3 mt-4">Mobile App</h3>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>All business data is stored locally on the user's device</li>
              <li>We do NOT collect or access this data</li>
            </ul>
            <h3 className="text-xl font-semibold text-white mb-3 mt-4">Web Application</h3>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Data is stored on our secure cloud servers</li>
              <li>Users have full control to update, delete, or remove their information</li>
              <li>You may request deletion via email: <a href="mailto:retailmarketingpro1.0@gmail.com" className="text-yellow-400 hover:text-yellow-300 underline">retailmarketingpro1.0@gmail.com</a></li>
            </ul>
            <p className="text-gray-200 leading-relaxed mb-2 mt-4">We only collect the minimum required:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Business type</li>
              <li>Person-in-charge name</li>
              <li>Contact details (phone or email)</li>
            </ul>
            <p className="text-gray-200 leading-relaxed">
              No other data is collected or shared.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">5. User Responsibilities</h2>
            <p className="text-gray-200 leading-relaxed mb-4">Users agree to:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Enter correct and accurate data</li>
              <li>Secure their device, login information, and accounts</li>
              <li>Maintain local backups (for mobile app users)</li>
              <li>Use the system only for lawful business purposes</li>
            </ul>
            <p className="text-gray-200 leading-relaxed mb-2 font-semibold">We are not responsible for:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>Mistyped entries</li>
              <li>Device loss or damage</li>
              <li>Local data deletion or reset</li>
              <li>Account misuse</li>
            </ul>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">6. Subscription & Payments</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              GOLD (GoldPOS) operates on a yearly subscription model.
            </p>
            <p className="text-gray-200 leading-relaxed">
              No monthly fees, hidden charges, or commissions are added.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">7. Refunds & Cancellation</h2>
            <p className="text-gray-200 leading-relaxed mb-4">Refunds follow these rules:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Refunds include third-party fees (payment gateway, tax, etc.)</li>
              <li>Cancellations may incur deductions per policy</li>
              <li>The maximum refundable or claimable amount is INR 100 under any circumstance</li>
            </ul>
            <p className="text-gray-200 leading-relaxed">
              All refund and cancellation terms are detailed in the Refund Policy.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">8. Prohibited Activities</h2>
            <p className="text-gray-200 leading-relaxed mb-4">Users may NOT:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Attempt to hack, disrupt, or misuse the system</li>
              <li>Reverse-engineer or copy the software</li>
              <li>Use GOLD (GoldPOS) for illegal transactions</li>
              <li>Use false identity or fraudulently represent a business</li>
            </ul>
            <p className="text-gray-200 leading-relaxed">
              Violations may lead to account suspension or permanent termination.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">9. Third-Party Services</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              Some features may rely on third-party services like:
            </p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Hosting/servers</li>
              <li>Payment gateways</li>
              <li>Email/SMS providers</li>
            </ul>
            <p className="text-gray-200 leading-relaxed mb-2 font-semibold">We are not responsible for:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>Third-party failures</li>
              <li>Downtime</li>
              <li>Data breaches caused by external services</li>
            </ul>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">10. Service Availability</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              We aim for high uptime but do NOT guarantee:
            </p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>24/7 availability</li>
              <li>Zero errors</li>
              <li>Uninterrupted performance</li>
            </ul>
            <p className="text-gray-200 leading-relaxed">
              Maintenance, updates, outages, or external issues may temporarily affect service.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">11. Intellectual Property</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              All intellectual property—including logos, brand name, software code, UI/UX, and content—is owned by RetailMarketingPro.
            </p>
            <p className="text-gray-200 leading-relaxed mb-2">Users may not:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>Copy</li>
              <li>Resell</li>
              <li>Distribute</li>
              <li>Modify the software</li>
            </ul>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">12. Limitation of Liability</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              To the fullest extent permitted by law:
            </p>
            <p className="text-gray-200 leading-relaxed mb-4 font-semibold text-yellow-400">
              Our maximum liability is limited to INR 100 (One Hundred Rupees Only) for any claim, refund, dispute, or damage.
            </p>
            <p className="text-gray-200 leading-relaxed mb-2 font-semibold">We are NOT liable for:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Loss of business</li>
              <li>Loss of revenue</li>
              <li>Loss of gold/stock</li>
              <li>Technical failures</li>
              <li>Incorrect data entered by the user</li>
            </ul>
            <p className="text-gray-200 leading-relaxed">
              The user is solely responsible for business operations and decisions.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">13. Changes to Terms</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              We may update these Terms from time to time.
            </p>
            <p className="text-gray-200 leading-relaxed">
              Continued use of the Service means you accept the updated Terms.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">14. Contact</h2>
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
            <Link to="/policy" className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
              Privacy Policy
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

export default TermsOfService;

