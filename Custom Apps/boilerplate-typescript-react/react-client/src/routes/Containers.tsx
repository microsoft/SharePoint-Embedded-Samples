import { Link, useLoaderData, useNavigate, useRevalidator } from "react-router-dom";
import { ILoaderParams } from "../common/ILoaderParams";
import { Breadcrumb, BreadcrumbButton, BreadcrumbItem, Button, DataGrid, DataGridBody, DataGridCell, DataGridHeader, DataGridHeaderCell, DataGridRow, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, DialogTrigger, Input, Label, OnSelectionChangeData, TableCellLayout, TableColumnDefinition, createTableColumn } from "@fluentui/react-components";
import { Delete20Filled } from "@fluentui/react-icons";
import { useState } from "react";
import { Spinner } from "@microsoft/mgt-react";
import { ChatController } from "../providers/ChatController";
import { ContainersApiProvider } from "../providers/ContainersApiProvider";
import { IContainer } from "../../../common/schemas/ContainerSchemas";

export async function loader({ params }: ILoaderParams): Promise<IContainer[]> {
    return await ContainersApiProvider.instance.list();
}

export const Containers: React.FunctionComponent = () => {
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [displayName, setDisplayName] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
    const [showCreatingSpinner, setShowCreatingSpinner] = useState<boolean>(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
    const [showDeletingSpinner, setShowDeletingSpinner] = useState<boolean>(false);
    const navigate = useNavigate();
    const containers = useLoaderData() as IContainer[];
    const revalidator = useRevalidator();

    const onSelectionChange = (e: any, data: OnSelectionChangeData) => {
        const selectedIds = Array.from(data.selectedItems) as string[];
        setSelectedItems(selectedIds);

        const selectedContainers = containers.filter((container) => selectedIds.includes(container.id));
        ChatController.instance.selectedContainers = selectedContainers;
    }

    const deleteSelectedContainers = async () => {
        setShowDeletingSpinner(true);
        const failed: string[] = [];
        for (const id of selectedItems) {
            try {
                await ContainersApiProvider.instance.delete(id);
            } catch {
                failed.push(id);
            }
        }
        setSelectedItems([]);
        setShowDeletingSpinner(false);
        setShowDeleteDialog(false);
        revalidator.revalidate();
        if (failed.length > 0) {
            alert(`Failed to delete ${failed.length} container${failed.length > 1 ? 's' : ''}.`);
        }
    };

    const submitCreateContainer = async () => {
        setShowCreatingSpinner(true);
        try {
            await ContainersApiProvider.instance.create({ displayName, description });
            setDisplayName("");
            setDescription("");
            setShowCreateDialog(false);
            revalidator.revalidate();
        } catch {
            alert('Failed to create container.');
        } finally {
            setShowCreatingSpinner(false);
        }
    }

    const columns: TableColumnDefinition<IContainer>[] = [
        createTableColumn({
            columnId: 'displayName',
            renderHeaderCell: () => {
                return 'Display name'
            },
            renderCell: (container) => {
                return (
                    <TableCellLayout>
                        <Link to={container.id}>{container.displayName}</Link>
                    </TableCellLayout>
                )
            }
        }),
        createTableColumn({
            columnId: 'description',
            renderHeaderCell: () => {
                return 'Description'
            },
            renderCell: (container) => {
                return (
                    <TableCellLayout>
                        {container.description}
                    </TableCellLayout>
                )
            }
        })
    ];


    const columnSizingOptions = {
        displayName: {
            minWidth: 250,
            defaultWidth: 250,
            idealWidth: 250
        },
        description: {
            minWidth: 190,
            defaultWidth: 190
        }
    };

    return (
        <div>
            <div className="view-container-breadcrumb">
                <Breadcrumb size='medium'>
                    <BreadcrumbItem>
                        <BreadcrumbButton size='medium' onClick={() => navigate('/containers')}>Containers</BreadcrumbButton>
                    </BreadcrumbItem>
                </Breadcrumb>
            </div>
            <Dialog open={showCreateDialog}>
                <DialogTrigger disableButtonEnhancement>
                    <Button appearance="primary" onClick={() => setShowCreateDialog(true)}>Create Container</Button>
                </DialogTrigger>
                <DialogSurface>
                    {!showCreatingSpinner && (
                    <DialogBody>
                    <DialogTitle>New Container</DialogTitle>
                    <DialogContent className="create-container-content">
                        Create a new container
                        <Label>Display name</Label>
                        <Input
                            placeholder="Display name"
                            aria-label="name"
                            type="text"
                            name="displayName"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            />
                        <Label>Description</Label>
                        <Input
                            placeholder="Description"
                            aria-label="Description"
                            type="text"
                            name="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            />
                    </DialogContent>
                    <DialogActions>
                        <Button appearance="primary" onClick={submitCreateContainer}>Create</Button>
                        <DialogTrigger disableButtonEnhancement>
                        <Button appearance="secondary" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                        </DialogTrigger>
                    </DialogActions>
                    </DialogBody>
                    )}
                    {showCreatingSpinner && (<>
                        <Spinner />
                        <p>Creating container...</p>
                    </>)}
                </DialogSurface>
            </Dialog>
            <Button
                appearance="subtle"
                icon={<Delete20Filled />}
                disabled={selectedItems.length === 0}
                onClick={() => setShowDeleteDialog(true)}
            >
                Delete
            </Button>
            <h2>Recent</h2>
            <DataGrid
                items={containers}
                columns={columns}
                getRowId={(item) => item.id}
                resizableColumns
                selectionMode="multiselect"
                columnSizingOptions={columnSizingOptions}
                selectedItems={selectedItems}
                onSelectionChange={onSelectionChange}
            >
            <DataGridHeader>
                <DataGridRow
                    selectionCell={{checkboxIndicator: { "aria-label": "Select row" }}}
                >
                    {({ renderHeaderCell }) => (
                        <DataGridHeaderCell><b>{renderHeaderCell()}</b></DataGridHeaderCell>
                    )}
                </DataGridRow>
            </DataGridHeader>
            <DataGridBody<IContainer>>
                {({ item, rowId }) => (
                    <DataGridRow<IContainer>
                        key={rowId}
                        selectionCell={{checkboxIndicator: { "aria-label": "Select row" }}}
                    >
                        {({ renderCell, columnId }) => (
                            <DataGridCell>
                                {renderCell(item)}
                            </DataGridCell>
                        )}
                    </DataGridRow>
                )}
            </DataGridBody>
        </DataGrid>
            <Dialog open={showDeleteDialog}>
                <DialogSurface>
                    {!showDeletingSpinner && (
                    <DialogBody>
                        <DialogTitle>Delete Container{selectedItems.length > 1 ? 's' : ''}</DialogTitle>
                        <DialogContent>
                            <p>Are you sure you want to delete {selectedItems.length} container{selectedItems.length > 1 ? 's' : ''}? This action cannot be undone.</p>
                        </DialogContent>
                        <DialogActions>
                            <Button appearance="primary" onClick={deleteSelectedContainers}>Delete</Button>
                            <Button appearance="secondary" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
                        </DialogActions>
                    </DialogBody>
                    )}
                    {showDeletingSpinner && (<>
                        <Spinner />
                        <p>Deleting container{selectedItems.length > 1 ? 's' : ''}...</p>
                    </>)}
                </DialogSurface>
            </Dialog>
        </div>
    );
}
