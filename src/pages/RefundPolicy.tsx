import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const RefundPolicy = () => {
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
              Refund, Cancellation & Dispute Policy
            </h1>
            <p className="text-gray-300 text-lg font-semibold mb-1">GOLD (GoldPOS) by RetailMarketingPro</p>
            <p className="text-gray-300 text-sm">Last Updated: 12/1/2025</p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <p className="text-gray-200 leading-relaxed mb-6">
              This Refund & Cancellation Policy applies to all users of GOLD (GoldPOS) ("we", "us", "our") at gold.retailmarketingpro.in.
            </p>
          </div>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">1. Annual Subscription Only</h2>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>GOLD (GoldPOS) is offered only on an annual subscription basis.</li>
              <li>We do not provide monthly subscriptions, per-transaction fees, or additional commissions.</li>
            </ul>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">2. Refund Eligibility</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              Refunds may only be requested in specific cases:
            </p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Duplicate payment made by mistake</li>
              <li>Technical issues on our side preventing access or activation</li>
              <li>Order placed by mistake and reported within 24 hours</li>
            </ul>
            <p className="text-gray-200 leading-relaxed">
              All other cases are not eligible for refund.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">3. Non-Refundable Charges</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              Refunds, if any, will include deductions for unavoidable fees:
            </p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>Payment gateway charges</li>
              <li>Processing fees</li>
              <li>Third-party commissions</li>
            </ul>
            <p className="text-gray-200 leading-relaxed mt-4">
              These fees are imposed by external providers and cannot be reversed.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">4. Maximum Refund Liability</h2>
            <p className="text-gray-200 leading-relaxed mb-4 font-semibold text-yellow-400">
              The maximum amount a user can claim in any case of refund, dispute, cancellation, or chargeback is INR 100 (One Hundred Rupees Only).
            </p>
            <p className="text-gray-200 leading-relaxed mb-4">
              This limit applies regardless of:
            </p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Duration of service usage</li>
              <li>Reason for cancellation</li>
              <li>Technical issues</li>
              <li>Remaining subscription period</li>
            </ul>
            <p className="text-gray-200 leading-relaxed">
              By purchasing GOLD (GoldPOS), the user agrees to this maximum liability.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">5. No Full Refund After Service Activation</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              Once your subscription is activated and access is granted:
            </p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>Full refunds are not available</li>
              <li>Third-party charges prevent complete refund</li>
              <li>The service is considered delivered and usable from the moment access is granted</li>
            </ul>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">6. Cancellation Policy</h2>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>Users may cancel their subscription at any time</li>
              <li>Cancellation does not guarantee a refund</li>
              <li>Subscription remains active until the end of the paid annual term</li>
            </ul>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">7. Disputes & Chargebacks</h2>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>Investigations for disputes or chargebacks may take 7–14 working days</li>
              <li>Our maximum liability remains INR 100</li>
              <li>False or fraudulent disputes may result in account suspension or termination</li>
            </ul>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">8. Contact for Refunds & Support</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              For refund requests, cancellations, or disputes, contact:
            </p>
            <div className="text-gray-200 space-y-2">
              <p className="font-semibold text-white">RetailMarketingPro</p>
              <p>Email: <a href="mailto:retailmarketingpro1.0@gmail.com" className="text-yellow-400 hover:text-yellow-300 underline">retailmarketingpro1.0@gmail.com</a></p>
              <p>Website: <a href="https://gold.retailmarketingpro.in" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 underline">gold.retailmarketingpro.in</a></p>
              <p className="text-gray-300 mt-4">Response time: 48–72 hours</p>
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

export default RefundPolicy;

