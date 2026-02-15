interface PageContainerProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
}

export function PageContainer({ children, className = '', title }: PageContainerProps) {
    return (
        <div className={`w-full max-w-7xl mx-auto px-6 py-6 ${className}`}>
            {title && <h1 className="text-3xl font-bold mb-6">{title}</h1>}
            {children}
        </div>
    );
}
