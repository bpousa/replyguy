import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  href?: string;
  className?: string;
  imageClassName?: string;
  showText?: boolean;
  textClassName?: string;
}

export function Logo({ 
  href = '/', 
  className = '', 
  imageClassName = '',
  showText = true,
  textClassName = ''
}: LogoProps) {
  const logoContent = (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Image
          src="/reply_guy_logo.png"
          alt="ReplyGuy Logo"
          width={32}
          height={32}
          className={`object-contain ${imageClassName}`}
          priority
        />
      </div>
      {showText && (
        <span className={`text-xl font-bold text-gray-900 dark:text-white ${textClassName}`}>
          ReplyGuy
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition-opacity">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}