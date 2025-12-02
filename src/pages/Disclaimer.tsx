import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Disclaimer = () => {
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
              Disclaimer
            </h1>
            <p className="text-gray-300 text-sm">Last Updated: 12/1/2025</p>
            <p className="text-gray-300 text-lg font-semibold mt-2">GOLD (GoldPOS) ("we", "us", "our") is a software tool provided by RetailMarketingPro to help jewellery and gold businesses manage their inventory, billing, and related operations. By using the Service, you acknowledge and agree to the following:</p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8">
          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">1. No Guarantees of Accuracy</h2>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>We do not guarantee that your entries, calculations, or reports are always correct.</li>
              <li>Errors, omissions, or miscalculations may occur.</li>
              <li>All data entered and reports generated are the responsibility of the user.</li>
            </ul>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">2. No Financial, Legal, or Business Advice</h2>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>GOLD (GoldPOS) is a business management tool only.</li>
              <li>It does not provide investment, financial, tax, or legal advice.</li>
              <li>Users are solely responsible for all business and financial decisions.</li>
            </ul>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">3. User Responsibility</h2>
            <p className="text-gray-200 leading-relaxed mb-4">Users must:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Maintain accurate data entries</li>
              <li>Secure their devices and login credentials</li>
              <li>Backup local data on mobile apps</li>
            </ul>
            <p className="text-gray-200 leading-relaxed mb-2 font-semibold">We are not responsible for:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>Device failures, resets, or loss</li>
              <li>Incorrect or missing entries</li>
              <li>Local storage issues</li>
            </ul>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">4. System Availability</h2>
            <p className="text-gray-200 leading-relaxed mb-4">We do not guarantee:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>24/7 uptime</li>
              <li>Error-free performance</li>
              <li>Uninterrupted access</li>
            </ul>
            <p className="text-gray-200 leading-relaxed">
              Service may be temporarily unavailable due to updates, maintenance, or external issues.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">5. Third-Party Services</h2>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Any third-party providers used (hosting, payment gateways, email/SMS services) are independent.</li>
              <li>We are not responsible for outages, errors, or charges imposed by third parties.</li>
            </ul>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">6. No Liability for Business Loss</h2>
            <p className="text-gray-200 leading-relaxed mb-2 font-semibold">We are not liable for:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Loss of revenue or sales</li>
              <li>Operational interruptions</li>
              <li>Business losses caused by errors or downtime</li>
              <li>Incorrect data entry or usage</li>
            </ul>
            <p className="text-gray-200 leading-relaxed">
              The user assumes full responsibility for business operations.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">7. Software Provided "As-Is"</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              The Service is provided on an "as-is" and "as-available" basis without warranties.
            </p>
            <p className="text-gray-200 leading-relaxed">
              We may modify, update, or discontinue features at any time.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">8. Maximum Liability</h2>
            <p className="text-gray-200 leading-relaxed mb-4 font-semibold text-yellow-400">
              Our maximum liability is INR 100 (One Hundred Rupees Only)
            </p>
            <p className="text-gray-200 leading-relaxed">
              This applies to all refunds, disputes, claims, damages, or losses related to the Service.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">9. Contact</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              For questions about this Disclaimer, contact:
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
            <Link to="/policy" className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
              Terms of Service
            </Link>
            <Link to="/refund" className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
              Refund Policy
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

export default Disclaimer;

