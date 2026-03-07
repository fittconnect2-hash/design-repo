'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, doc, setDoc } from 'firebase/firestore';
import { Bell, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Badge } from './ui/badge';
import type { Notification } from '@/lib/definitions';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';

export function UserNotifications() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isOpen, setIsOpen] = useState(false);

    const notificationsQuery = useMemo(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'notifications'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, user]);

    const { data: notifications } = useCollection<Notification>(notificationsQuery);

    const unreadCount = useMemo(() => {
        if (!notifications) return 0;
        return notifications.filter(n => !n.isRead).length;
    }, [notifications]);

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.isRead) {
            const notifRef = doc(firestore, 'notifications', notification.id);
            await setDoc(notifRef, { isRead: true }, { merge: true });
        }
        setIsOpen(false);
    };
    
    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                 <Button variant="outline" size="icon" className="h-8 w-8 relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 justify-center rounded-full p-0 text-xs">
                            {unreadCount}
                        </Badge>
                    )}
                    <span className="sr-only">Toggle notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                 <div className="p-4 font-medium border-b">Notifications</div>
                 <ScrollArea className="h-96">
                    {notifications && notifications.length > 0 ? (
                        <div className="divide-y">
                            {notifications.map(notification => (
                                <Link
                                    key={notification.id}
                                    href={notification.link || '#'}
                                    passHref
                                    legacyBehavior
                                >
                                    <a
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`block p-4 hover:bg-accent ${!notification.isRead ? 'bg-accent/50' : ''}`}
                                    >
                                        <div className="font-semibold">{notification.title}</div>
                                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : ''}
                                        </p>
                                    </a>
                                </Link>
                            ))}
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                            <Mail className="h-8 w-8 mb-2" />
                            <p>You're all caught up!</p>
                         </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
