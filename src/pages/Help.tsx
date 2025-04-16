
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Help = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 pb-24">
      <div className="max-w-6xl mx-auto">
        <header className="bg-black/40 border border-blue-400/30 backdrop-blur-sm rounded-lg shadow-lg p-4 mb-6 flex items-center">
          <Button 
            asChild
            variant="ghost" 
            size="icon"
            className="mr-2 text-blue-300 hover:text-blue-200 hover:bg-black/40"
          >
            <Link to="/settings">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-white">Help & Support</h1>
        </header>

        <div className="pb-6">
          <h2 className="text-2xl font-bold text-blue-300 mb-2">Frequently Asked Questions</h2>
          <p className="text-blue-100/70 mb-6">Answers to common questions</p>
          
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="item-1" className="bg-black/40 border border-blue-400/30 backdrop-blur-sm rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 text-blue-200 hover:text-blue-100 text-lg font-medium">
                How do I set up notifications?
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 text-blue-100/80">
                To set up notifications, go to Settings &gt; Notifications and toggle the switch to enable them.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-black/40 border border-blue-400/30 backdrop-blur-sm rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 text-blue-200 hover:text-blue-100 text-lg font-medium">
                How do I change my password?
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 text-blue-100/80">
                To change your password, go to Settings &gt; Security and update your password in the form provided.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-black/40 border border-blue-400/30 backdrop-blur-sm rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 text-blue-200 hover:text-blue-100 text-lg font-medium">
                How do I view my recorded clips?
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 text-blue-100/80">
                To view recorded clips, go to the Clips section from the navigation menu in the dashboard.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
};

export default Help;
