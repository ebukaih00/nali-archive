import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-[#F8F7F5] flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-serif text-foreground mb-4">Access Denied</h2>
                <p className="text-secondary mb-8">
                    You do not have permission to access the Contributor Dashboard. If you believe this is an error, please contact the administrator or apply to become a contributor.
                </p>
                <div className="flex flex-col gap-3">
                    <Link href="/" className="px-6 py-3 bg-gray-100 text-foreground rounded-xl font-medium hover:bg-gray-200 transition-colors">
                        Back to Home
                    </Link>
                    <Link href="/contribute" className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors">
                        Apply to Contribute
                    </Link>
                </div>
            </div>
        </div>
    );
}
