
import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { DonateModal } from '../components/DonateModal';

const DonateView = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="max-w-3xl mx-auto py-12 px-6 text-center animate-fade-in">
            <div
                className="bg-cover bg-center p-12 rounded-[2.5rem] shadow-xl relative overflow-hidden text-white"
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=2070&auto=format&fit=crop')` }}
            >
                <div className="absolute inset-0 bg-black/60 rounded-[2.5rem]"></div>
                
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl shadow-sm text-white mb-8 relative z-10">
                    <Heart size={40} className="fill-white"/>
                </div>
                <h2 className="text-4xl font-extrabold mb-4 relative z-10">SUPPORT WITH LOVE</h2>
                <p className="text-xl text-slate-200 mb-8 leading-relaxed max-w-lg mx-auto relative z-10">
                    Your contribution can make a world of difference. By donating, you're not just supporting a project; you're extending a helping hand to fellow job seekers who are most in need, providing them with the tools and hope to build a better future.
                </p>
                
                <div className="flex justify-center items-center relative z-10">
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-white hover:bg-gray-200 text-gray-900 px-10 py-5 rounded-2xl font-bold shadow-xl transition-all hover:scale-105 flex items-center gap-3 text-lg uppercase tracking-wider"
                    >
                        SUPPORT THE PROJECT <Heart size={20} className="text-red-500" />
                    </button>
                </div>
            </div>
            <DonateModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};

export default DonateView;
