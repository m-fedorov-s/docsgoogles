package storage

import (
	"fmt"
	"reflect"

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
	if s.db == nil {
		return fmt.Errorf("Storage[%T, %T] is not initialized", k, v)
	}
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
	if s.db == nil {
		var v V
		return v, fmt.Errorf("Storage[%T, %T] is not initialized", k, v)
	}
	var valCopy []byte
	err := s.db.View(func(txn *badger.Txn) error {
		keyBytes, err := k.Serialize()
		if err != nil {
			return err
		}
		item, err := txn.Get(keyBytes)
		if err != nil {
			return err
		}
		valCopy, err = item.ValueCopy(nil)
		return err
	})
	valueType := reflect.TypeOf((*V)(nil)).Elem().Elem()
	v := reflect.New(valueType).Interface().(V)
	if err != nil {
		return v, err
	}
	err = v.Deserialize(valCopy)
	return v, err
}

func (s *Storage[K, V]) Contains(k K) (bool, error) {
	if s.db == nil {
		var v V
		return false, fmt.Errorf("Storage[%T, %T] is not initialized", k, v)
	}
	var found bool
	err := s.db.View(func(txn *badger.Txn) error {
		keyBytes, err := k.Serialize()
		if err != nil {
			return err
		}
		_, err = txn.Get(keyBytes)
		if err == badger.ErrKeyNotFound {
			found = false
		} else {
			found = true
		}
		return nil
	})
	return found, err
}
