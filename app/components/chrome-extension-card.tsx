import { Chrome, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export function ChromeExtensionCard() {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Chrome className="w-7 h-7 text-white" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg">Reply 100x Faster</h3>
            <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full text-xs font-medium">
              <Zap className="w-3 h-3" />
              NEW
            </div>
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Generate replies directly from X without tab switching. Our Chrome extension makes replying instant and effortless.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
              asChild
            >
              <a
                href="https://chromewebstore.google.com/detail/reply-guy-for-x-twitter/ggdieefnnmcgnmonbkngnmonoifdgmje?authuser=3&hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <Chrome className="w-4 h-4" />
                Install Extension
              </a>
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              asChild
            >
              <a
                href="/extension"
                className="inline-flex items-center gap-2"
              >
                Learn More
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}