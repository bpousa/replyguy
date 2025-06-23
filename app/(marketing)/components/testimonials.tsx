'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah Chen',
    handle: '@sarahcodes',
    avatar: '👩‍💻',
    content: 'ReplyGuy literally doubled my engagement. The memes are always on point and my replies actually get likes now!',
    rating: 5,
  },
  {
    name: 'Mike Johnson',
    handle: '@mikej',
    avatar: '🧔',
    content: 'I was skeptical about AI replies, but these are indistinguishable from human tweets. Game changer for building my audience.',
    rating: 5,
  },
  {
    name: 'Alex Rivera',
    handle: '@alexr',
    avatar: '👤',
    content: 'The style matching is incredible. It picks up on the vibe perfectly every time. Worth every penny of the Pro plan.',
    rating: 5,
  },
  {
    name: 'Emma Wilson',
    handle: '@emmawrites',
    avatar: '✍️',
    content: 'As a content creator, this saves me hours. The daily goals keep me consistent and the celebrations are actually fun!',
    rating: 5,
  },
  {
    name: 'David Park',
    handle: '@dpark',
    avatar: '🎯',
    content: 'No more cringe AI responses. ReplyGuy gets Twitter culture and helps me stay relevant in conversations.',
    rating: 5,
  },
  {
    name: 'Lisa Thompson',
    handle: '@lisathompson',
    avatar: '💼',
    content: 'The research feature is clutch for staying informed. My replies are now both witty AND accurate.',
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Loved by{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                Reply Legends
              </span>
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands who've transformed their Twitter game
            </p>
          </motion.div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.handle}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="bg-white rounded-2xl p-6 shadow-sm border h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">{testimonial.avatar}</div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.handle}</div>
                  </div>
                </div>
                
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <p className="text-gray-700 flex-grow">
                  "{testimonial.content}"
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}