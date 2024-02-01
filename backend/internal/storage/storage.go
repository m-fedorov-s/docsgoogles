package storage

import (
	badger "github.com/dgraph-io/badger/v4"
)

type Serializable interface {
	Serialize() ([]byte, error)
	Deserialize([]byte) error
}

type Storage[K Serializable, V Serializable] struct {
	db *badger.DB
}

func (s *Storage[K, V]) Init(path string) error {
	res, err := badger.Open(badger.DefaultOptions(path))
	if err == nil {
		s.db = res
	}
	return err
}

func (s *Storage[K, V]) Close() {
	if s.db != nil {
		s.db.Close()
	}
}

func (s *Storage[K, V]) Put(k K, v V) error {
	err := s.db.Update(func(txn *badger.Txn) error {
		keyBytes, err := k.Serialize()
		if err != nil {
			return err
		}
		valueBytes, err := v.Serialize()
		if err != nil {
			return err
		}
		err = txn.Set(keyBytes, valueBytes)
		return err
	})
	return err
}

func (s *Storage[K, V]) Get(k K) (V, error) {
	var v V
	err := s.db.View(func(txn *badger.Txn) error {
		keyBytes, err := k.Serialize()
		if err != nil {
			return err
		}
		item, err := txn.Get(keyBytes)
		if err != nil {
			return err
		}
		err = item.Value(func(val []byte) error {
			return v.Deserialize(val)
		})
		return err
	})
	return v, err
}
