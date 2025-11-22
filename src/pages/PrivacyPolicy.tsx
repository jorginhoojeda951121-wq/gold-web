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
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-gray-300 text-sm">Last updated: 2024</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <p className="text-gray-200 leading-relaxed mb-6">
              Retail Marketing Pro is committed to protecting the privacy of the personal information you provide us on our Website. We believe it is important for you to know how we treat the information you share with us. The following policy will explain how your personal information will be treated as you use our Web site and its features. Personal information includes your name, address, telephone number, email addresses, click-through activity and any other information you may provide here. Your email address and all other personal information is collected only when you voluntarily provide that data while submitting forms such as reservations or online orders.
            </p>
          </div>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">General Notice</h2>
            <p className="text-gray-200 leading-relaxed">
              Retail Marketing Pro strives to ensure that the information contained in this web site is accurate and reliable. However, Retail Marketing Pro and the World Wide Web (or Web Site Host) are not infallible and errors may sometimes occur. Therefore, to the fullest extent permissible pursuant to applicable law, Retail Marketing Pro disclaims any warranty of any kind, whether expressed or implied, as to any matter whatsoever relating to this web site. Retail Marketing Pro is not liable or responsible for any damages or injuries caused by use of this web site (such as viruses, omissions or misstatements). Retail Marketing Pro may revise the information, services and the resources contained in this web site from time to time and we reserve the right to make such changes without obligation to notify past, current or prospective visitors. In no event shall Retail Marketing Pro be liable for any indirect, special, incidental, or consequential damages arising out of any use of the information contained herein.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">Copyrights Notice</h2>
            <p className="text-gray-200 leading-relaxed mb-4">
              The text and Html code contained in this web site are the exclusive property of Retail Marketing Pro. Except where otherwise noted, the text and Html code contained here may not be copied, distributed, displayed, reproduced or transmitted in any form or by any means without the prior written permission of Retail Marketing Pro.
            </p>
            <p className="text-gray-200 leading-relaxed">
              Unless otherwise stated, the photographic images on http://www.retailmarketingpro.in are owned by Retail Marketing Pro, its licensors, or its third-party image partners. You may not use any of the photographic images or graphic material on http://www.retailmarketingpro.in, in whole or in part, without written permission of Retail Marketing Pro.
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">Hyper-Links Notice</h2>
            <p className="text-gray-200 leading-relaxed">
              Retail Marketing Pro`s, web site may link to sites not maintained by or related to Retail Marketing Pro. Hypertext links are provided as a service to users and are not sponsored by or affiliated with this web site or Retail Marketing Pro. Retail Marketing Pro has not reviewed the sites hyper-linked to or from this web site and is not responsible for the content of any other site. These links are to be accessed at the user`s own risk. Retail Marketing Pro makes no representations or warranties about the content, completeness, or accuracy of these links or the sites hyper-linked to this web site. Furthermore, Retail Marketing Pro does not implicitly endorse third-party sites hyper-linked to this website.
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
            <Link to="/terms" className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

