'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import QuoteForm from '@/components/corporate/QuoteForm';

export default function NewQuotePage() {
    const router = useRouter();

    return (
        <PageContainer>
            <Link href="/dashboard/corporate" className="text-sm text-muted-foreground flex items-center gap-1 mb-2 hover:underline">
                <ArrowLeft className="h-4 w-4" /> Corporativo
            </Link>
            <h1 className="text-3xl font-serif font-bold mb-6">Nueva Cotización</h1>
            <QuoteForm onSaved={(quote) => router.replace(`/dashboard/corporate/quotes/${quote.id}`)} />
        </PageContainer>
    );
}
