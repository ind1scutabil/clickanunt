/**
 * UI Components Demo Page - ETAPA 3
 * 
 * Showcase for all design system components
 */

'use client';

import React from 'react';
import { 
  Button, 
  Input, 
  Select, 
  Textarea, 
  Card, 
  Badge,
  Modal,
  Dialog,
  Dropdown,
  Skeleton,
  Progress,
  Tabs,
  Accordion,
  Avatar,
  Tooltip,
  useToast,
  ToastProvider,
} from '@/app/components/ui';

function DemoContent() {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const categories = [
    { value: '', label: 'Selectează categoria' },
    { value: 'auto', label: 'Automobile' },
    { value: 'imobiliare', label: 'Imobiliare' },
    { value: 'electronice', label: 'Electronice' },
  ];

  const handleLoadingClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-black text-white mb-4">
            Enterprise UI Components
          </h1>
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
            Design system complet - Etapa 3 Complete
          </p>
        </div>

        <div className="space-y-16">
          {/* Buttons */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-6">Buttons</h2>
            <Card variant="elevated">
              <Card.Body>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-400 uppercase mb-3">Variants</h3>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="primary">Primary</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="ghost">Ghost</Button>
                      <Button variant="destructive">Destructive</Button>
                      <Button variant="link">Link Button</Button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-400 uppercase mb-3">Loading State</h3>
                    <Button variant="primary" loading={loading} onClick={handleLoadingClick}>
                      Click to Test Loading
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </section>

          {/* Modal - NEW in Etapa 3 */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-6">Modal Component ⚡ NEW</h2>
            <Card variant="elevated">
              <Card.Body>
                <div className="space-y-4">
                  <p className="text-neutral-300 mb-4">
                    Full-screen overlay modal with animations and focus trap
                  </p>
                  <Button onClick={() => setModalOpen(true)}>
                    Deschide Modal
                  </Button>
                  
                  <Modal
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    size="md"
                  >
                    <Modal.Header 
                      title="Add New Listing"
                      subtitle="Fill in the details below"
                    />
                    <Modal.Body>
                      <div className="space-y-4">
                        <Input
                          label="Listing Title"
                          placeholder="E.g. BMW X5 2020"
                        />
                        <Select
                          label="Category"
                          options={categories}
                          placeholder="Select category"
                        />
                        <Textarea
                          label="Description"
                          placeholder="Describe your listing..."
                          rows={4}
                        />
                      </div>
                    </Modal.Body>
                    <Modal.Footer>
                      <Button variant="ghost" onClick={() => setModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="primary">
                        Create Listing
                      </Button>
                    </Modal.Footer>
                  </Modal>
                </div>
              </Card.Body>
            </Card>
          </section>

          {/* Dialog - NEW in Etapa 3 */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-6">Dialog Component ⚡ NEW</h2>
            <Card variant="elevated">
              <Card.Body>
                <div className="space-y-4">
                  <p className="text-neutral-300 mb-4">
                    Confirmation dialogs with preset variants
                  </p>
                  <Button 
                    variant="destructive"
                    onClick={() => setDialogOpen(true)}
                  >
                    Open Destructive Dialog
                  </Button>

                  <Dialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    title="Șterge anunț"
                    description="Ești sigur că vrei să ștergi acest anunț? Această acțiune nu poate fi anulată."
                    variant="destructive"
                    onConfirm={async () => {
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      showToast({
                        title: 'Anunț șters',
                        description: 'Anunțul a fost șters cu succes',
                        variant: 'success'
                      });
                    }}
                  />
                </div>
              </Card.Body>
            </Card>
          </section>

          {/* Dropdown - NEW in Etapa 3 */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-6">Dropdown Component ⚡ NEW</h2>
            <Card variant="elevated">
              <Card.Body>
                <div className="space-y-4">
                  <p className="text-neutral-300 mb-4">
                    Dropdown menu with keyboard navigation
                  </p>
                  <Dropdown>
                    <Dropdown.Trigger>
                      <Button variant="secondary">
                        Actions Menu
                      </Button>
                    </Dropdown.Trigger>
                    <Dropdown.Menu>
                      <Dropdown.Item
                        icon={
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        }
                        onClick={() => showToast({ title: 'Edit clicked', variant: 'info' })}
                      >
                        Edit
                      </Dropdown.Item>
                      <Dropdown.Item
                        icon={
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        }
                        onClick={() => showToast({ title: 'Copied!', variant: 'success' })}
                      >
                        Duplicate
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      <Dropdown.Item
                        danger
                        icon={
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        }
                        onClick={() => showToast({ title: 'Deleted', variant: 'error' })}
                      >
                        Delete
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </Card.Body>
            </Card>
          </section>

          {/* Toast - NEW in Etapa 3 */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-6">Toast Notifications ⚡ NEW</h2>
            <Card variant="elevated">
              <Card.Body>
                <div className="space-y-4">
                  <p className="text-neutral-300 mb-4">
                    Click pentru a afișa notificări (top-right corner)
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => showToast({
                        title: 'Default Toast',
                        description: 'This is a default notification',
                        variant: 'default'
                      })}
                    >
                      Default
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => showToast({
                        title: 'Success!',
                        description: 'Your listing was published',
                        variant: 'success'
                      })}
                    >
                      Success
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => showToast({
                        title: 'Error',
                        description: 'Something went wrong',
                        variant: 'error'
                      })}
                    >
                      Error
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => showToast({
                        title: 'Warning',
                        description: 'Please verify your email',
                        variant: 'warning'
                      })}
                    >
                      Warning
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => showToast({
                        title: 'Info',
                        description: 'New feature available',
                        variant: 'info'
                      })}
                    >
                      Info
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </section>

          {/* Real Example */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-6">Real-World Example</h2>
            <Card variant="elevated" interactive>
              <Card.Body>
                <div className="flex items-start gap-4">
                  <img
                    src="https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=300&h=200&fit=crop"
                    alt="BMW X5"
                    className="w-48 h-32 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">
                          BMW X5 xDrive40d
                        </h3>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="success">Verified</Badge>
                          <Badge variant="primary">Premium</Badge>
                        </div>
                      </div>
                      <Dropdown>
                        <Dropdown.Trigger>
                          <Button variant="ghost" size="sm">
                            ⋮
                          </Button>
                        </Dropdown.Trigger>
                        <Dropdown.Menu align="right">
                          <Dropdown.Item onClick={() => showToast({ title: 'Viewing details', variant: 'info' })}>
                            View Details
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => showToast({ title: 'Saved!', variant: 'success' })}>
                            Save
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item danger onClick={() => showToast({ title: 'Reported', variant: 'error' })}>
                            Report
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                    <p className="text-neutral-300 text-sm mb-4">
                      2020 • 45.000 km • Diesel • 4x4 • Automat
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-bold text-primary-400">
                        45.900 €
                      </span>
                      <Button variant="primary">
                        Contact Seller
                      </Button>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </section>

          {/* Skeleton - NEW in Etapa 4 */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-6">Skeleton Loader ⚡ NEW</h2>
            <Card variant="elevated">
              <Card.Body>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-400 uppercase mb-3">Loading States</h3>
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton variant="text" lines={3} />
                      <div className="flex items-center gap-4">
                        <Skeleton variant="circle" className="w-16 h-16" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </section>

          {/* Progress - NEW in Etapa 4 */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-6">Progress Bar ⚡ NEW</h2>
            <Card variant="elevated">
              <Card.Body>
                <div className="space-y-6">
                  <Progress value={45} variant="primary" showLabel label="Upload Progress" />
                  <Progress value={80} variant="success" showLabel />
                  <Progress value={30} variant="error" size="lg" />
                  <Progress value={60} variant="warning" size="sm" showLabel />
                </div>
              </Card.Body>
            </Card>
          </section>

          {/* Tabs - NEW in Etapa 4 */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-6">Tabs Component ⚡ NEW</h2>
            <Card variant="elevated">
              <Card.Body>
                <Tabs defaultValue="overview">
                  <Tabs.List>
                    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
                    <Tabs.Trigger value="specs">Specifications</Tabs.Trigger>
                    <Tabs.Trigger value="reviews">Reviews</Tabs.Trigger>
                  </Tabs.List>
                  <Tabs.Content value="overview">
                    <p className="text-neutral-300">
                      This is the overview tab content. Tabs support keyboard navigation with arrow keys.
                    </p>
                  </Tabs.Content>
                  <Tabs.Content value="specs">
                    <p className="text-neutral-300">
                      Technical specifications and details go here.
                    </p>
                  </Tabs.Content>
                  <Tabs.Content value="reviews">
                    <p className="text-neutral-300">
                      User reviews and ratings appear in this section.
                    </p>
                  </Tabs.Content>
                </Tabs>
              </Card.Body>
            </Card>
          </section>

          {/* Accordion - NEW in Etapa 4 */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-6">Accordion Component ⚡ NEW</h2>
            <Card variant="elevated">
              <Card.Body>
                <Accordion type="single" collapsible defaultValue="faq1">
                  <Accordion.Item value="faq1">
                    <Accordion.Trigger>How do I create a listing?</Accordion.Trigger>
                    <Accordion.Content>
                      <p className="text-neutral-300">
                        Click the "Add Listing" button in your dashboard, fill in the required information,
                        upload photos, and submit for review.
                      </p>
                    </Accordion.Content>
                  </Accordion.Item>
                  <Accordion.Item value="faq2">
                    <Accordion.Trigger>How long does verification take?</Accordion.Trigger>
                    <Accordion.Content>
                      <p className="text-neutral-300">
                        Most listings are reviewed within 24 hours. You'll receive an email notification
                        once your listing is approved.
                      </p>
                    </Accordion.Content>
                  </Accordion.Item>
                  <Accordion.Item value="faq3">
                    <Accordion.Trigger>Can I promote my listing?</Accordion.Trigger>
                    <Accordion.Content>
                      <p className="text-neutral-300">
                        Yes! You can promote your listing to appear at the top of search results.
                        Visit the listing page and click "Promote" to see available options.
                      </p>
                    </Accordion.Content>
                  </Accordion.Item>
                </Accordion>
              </Card.Body>
            </Card>
          </section>

          {/* Avatar - NEW in Etapa 4 */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-6">Avatar Component ⚡ NEW</h2>
            <Card variant="elevated">
              <Card.Body>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-400 uppercase mb-3">Sizes & Status</h3>
                    <div className="flex items-center gap-4">
                      <Avatar size="xs" initials="XS" status="online" />
                      <Avatar size="sm" initials="SM" status="away" />
                      <Avatar size="md" initials="MD" status="busy" />
                      <Avatar size="lg" initials="LG" status="offline" />
                      <Avatar size="xl" initials="XL" status="online" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-400 uppercase mb-3">Avatar Group</h3>
                    <Avatar.Group max={4}>
                      <Avatar initials="JD" size="md" />
                      <Avatar initials="SM" size="md" />
                      <Avatar initials="AB" size="md" />
                      <Avatar initials="CD" size="md" />
                      <Avatar initials="EF" size="md" />
                      <Avatar initials="GH" size="md" />
                    </Avatar.Group>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </section>

          {/* Tooltip - NEW in Etapa 4 */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-6">Tooltip Component ⚡ NEW</h2>
            <Card variant="elevated">
              <Card.Body>
                <div className="space-y-6">
                  <p className="text-neutral-300 mb-4">
                    Hover over buttons to see tooltips in different positions
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-6">
                    <Tooltip content="Tooltip on top" position="top">
                      <Button variant="secondary">Top</Button>
                    </Tooltip>
                    <Tooltip content="Tooltip on right" position="right">
                      <Button variant="secondary">Right</Button>
                    </Tooltip>
                    <Tooltip content="Tooltip on bottom" position="bottom">
                      <Button variant="secondary">Bottom</Button>
                    </Tooltip>
                    <Tooltip content="Tooltip on left" position="left">
                      <Button variant="secondary">Left</Button>
                    </Tooltip>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-neutral-500 text-sm">
          <p>ClickAnunț Enterprise Design System</p>
          <p className="mt-2">Etapa 1: Tokens ✓ | Etapa 2: Components ✓ | Etapa 3: Overlays ✓ | Etapa 4: Advanced ✓</p>
        </div>
      </div>
    </div>
  );
}

export default function UIDemo() {
  return (
    <ToastProvider>
      <DemoContent />
    </ToastProvider>
  );
}
