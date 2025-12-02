import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const CookieNotice = () => {
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
              Cookie Notice
            </h1>
            <p className="text-gray-300 text-sm">Last Updated: 12/1/2025</p>
            <p className="text-gray-300 text-lg font-semibold mt-2">
              This Cookie Notice explains how RetailMarketingPro ("we", "us", "our") uses cookies and similar technologies on our website gold.retailmarketingpro.in.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8">
          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">1. What Are Cookies?</h2>
            <p className="text-gray-200 leading-relaxed">
              Cookies are small text files stored on your device when you visit a website. They help improve website performance and enable certain features to work correctly.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">2. Types of Cookies We Use</h2>
            <h3 className="text-xl font-semibold text-white mb-3 mt-4">A. Essential Cookies</h3>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Required for the website to function properly</li>
              <li>Examples:
                <ul className="list-circle list-inside ml-6 mt-2 space-y-1">
                  <li>Session management</li>
                  <li>Login authentication</li>
                  <li>Security measures</li>
                </ul>
              </li>
            </ul>
            <p className="text-gray-200 leading-relaxed">
              Without these cookies, the website may not function correctly.
            </p>
            <h3 className="text-xl font-semibold text-white mb-3 mt-6">B. Analytical / Performance Cookies (Optional)</h3>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4">
              <li>Used to improve website performance</li>
              <li>Collect anonymous, non-identifiable information</li>
              <li>Track basic usage patterns, such as page visits</li>
            </ul>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">3. No Marketing or Tracking Cookies</h2>
            <p className="text-gray-200 leading-relaxed mb-2 font-semibold">We do NOT use:</p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Advertising cookies</li>
              <li>Retargeting pixels</li>
              <li>Third-party marketing trackers</li>
              <li>Social media tracking</li>
            </ul>
            <p className="text-gray-200 leading-relaxed">
              Your browsing activity is not monitored for marketing purposes.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">4. Cookies Do Not Collect Personal Data</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              Cookies do not store personal information such as:
            </p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Name</li>
              <li>Phone number</li>
              <li>Email</li>
              <li>Financial or business data</li>
            </ul>
            <p className="text-gray-200 leading-relaxed">
              Personal data is only collected when you voluntarily provide it during account creation or contact.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">5. Managing Cookies</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              You can manage cookies via your browser settings:
            </p>
            <ul className="list-disc list-inside text-gray-200 space-y-2 ml-4 mb-4">
              <li>Disable cookies</li>
              <li>Clear cookies at any time</li>
              <li>Block non-essential cookies</li>
            </ul>
            <p className="text-gray-200 leading-relaxed">
              Note: Disabling essential cookies may affect website functionality.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">6. Changes to This Notice</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              We may update this Cookie Notice periodically.
            </p>
            <p className="text-gray-200 leading-relaxed">
              Changes will be posted on this page with an updated "Last Updated" date.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">7. Contact</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              For questions about our Cookie Notice:
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
          <div className="flex gap-4">
            <Link to="/policy" className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
              Terms of Service
            </Link>
            <Link to="/refund" className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
              Refund Policy
            </Link>
            <Link to="/disclaimer" className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
              Disclaimer
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieNotice;

